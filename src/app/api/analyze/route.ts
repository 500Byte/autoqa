import { NextResponse } from 'next/server';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import pLimit from 'p-limit';
import { analyzeSeo } from '@/lib/analyzer/seo';
import { runAxeAnalysis } from '@/lib/analyzer/accessibility';
import { checkLinks } from '@/lib/analyzer/links';
import { analyzeGoogleAnalytics, extractAnalyticsFromScriptContent } from '@/lib/analyzer/analytics';
import { analyzeSearchConsole } from '@/lib/analyzer/searchconsole';
import { AnalysisSettings } from '@/types';

export const dynamic = 'force-dynamic';

// --- CONFIGURACIÓN POR DEFECTO ---
const DEFAULT_MAX_CONCURRENCY = 2;
const ANALYSIS_ENGINE: 'headless' | 'cdp' = 'headless';
const CONTEXT_STRATEGY: 'shared' | 'per-url' = 'shared';
const DEFAULT_TIMEOUT = 30000;

// Obtener o crear contexto según la estrategia
async function getContext(browser: Browser, existingContext: BrowserContext | null): Promise<BrowserContext> {
    if (CONTEXT_STRATEGY === 'shared') {
        if (existingContext) return existingContext;
        return await browser.newContext();
    }
    // La estrategia Per-URL crea un contexto nuevo cada vez
    return await browser.newContext();
}

// Lógica para analizar una sola URL
async function analyzeSingleUrl(
    url: string,
    browser: Browser,
    sharedContext: BrowserContext | null,
    sendLog: (msg: string) => void,
    sendResult: (url: string, res: any) => void,
    request: Request,
    dnsCache: Map<string, Promise<any[]>>,
    settings: AnalysisSettings,
    tags: string[]
) {
    if (request.signal.aborted) return;

    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
        sendLog(`▶️ Iniciando análisis: ${url}`);

        // Gestión de contexto
        if (CONTEXT_STRATEGY === 'shared') {
            // Reutilizar el contexto compartido
            context = sharedContext!;
        } else {
            // Crear un contexto nuevo para esta URL
            context = await getContext(browser, null);
        }

        // Crear página
        page = await context.newPage();

        // Verificar aborto antes de operaciones pesadas
        if (request.signal.aborted) throw new Error('Aborted by user');

        // Limite de tiempo (30s)
        await Promise.race([
            (async () => {
                // Navegación
                try {
                    await page!.goto(url, { waitUntil: 'networkidle', timeout: settings.timeout * 0.66 });
                } catch (e) {
                    if (request.signal.aborted) throw new Error('Aborted by user');
                    sendLog(`⚠️ Timeout idle en ${url}, reintentando con 'load'...`);
                    await page!.goto(url, { waitUntil: 'load', timeout: settings.timeout * 0.66 });
                }

                if (request.signal.aborted) throw new Error('Aborted by user');

                // Extracción de datos
                const pageData = await page!.evaluate(() => {
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
                        tag: h.tagName.toLowerCase(),
                        text: h.textContent?.trim() || '',
                        level: parseInt(h.tagName.substring(1))
                    }));

                    const links = Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href);
                    const images = Array.from(document.querySelectorAll('img')).map(img => ({
                        src: img.src,
                        alt: img.alt
                    }));

                    const meta = document.querySelector('meta[name="description"]');
                    const metaDescription = meta ? meta.getAttribute('content') : null;

                    // Extraer fuentes de scripts para detección de analíticas
                    const scripts = Array.from(document.querySelectorAll('script[src]')).map(script =>
                        (script as HTMLScriptElement).src
                    );

                    // Extraer contenidos de scripts inline para detección adicional
                    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])')).map(script =>
                        script.textContent || ''
                    );

                    // Extraer meta tag de Google Search Console
                    const gscMeta = document.querySelector('meta[name="google-site-verification"]');
                    const gscMetaContent = gscMeta ? gscMeta.getAttribute('content') : null;

                    return {
                        headings,
                        links,
                        images,
                        title: document.title,
                        metaDescription,
                        scripts,
                        inlineScripts,
                        gscMetaContent
                    };
                });

                // Análisis SEO
                const seoIssues = analyzeSeo({
                    headings: pageData.headings,
                    title: pageData.title,
                    metaDescription: pageData.metaDescription
                });

                // Scroll para carga diferida
                try {
                    await page!.evaluate(async () => {
                        await new Promise((resolve) => {
                            let totalHeight = 0;
                            const distance = 400;
                            const maxScrolls = 10;
                            let scrolls = 0;
                            const timer = setInterval(() => {
                                const scrollHeight = document.body.scrollHeight;
                                window.scrollBy(0, distance);
                                totalHeight += distance;
                                scrolls++;
                                if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
                                    clearInterval(timer);
                                    resolve(true);
                                }
                            }, 50);
                        });
                    });
                } catch (e) { /* ignore */ }

                await page!.waitForTimeout(500);
                if (request.signal.aborted) throw new Error('Aborted by user');

                // Análisis de accesibilidad
                const accessibilityIssues = await runAxeAnalysis(page!, tags);
                const totalInstances = accessibilityIssues.reduce((acc, curr) => acc + (curr.nodes?.length || 0), 0);
                sendLog(`🔍 Accesibilidad: ${accessibilityIssues.length} reglas, ${totalInstances} instancias detectadas con etiquetas [${tags.join(', ')}]`);

                // Enlaces rotos
                const linkResults = await checkLinks(pageData.links);
                const brokenLinks = linkResults.filter(l => !l.ok);

                // Detección de analíticas (mantener por URL para ver si hay variaciones, pero el global se hará aparte)
                const googleAnalytics = analyzeGoogleAnalytics(pageData.scripts);

                // Extract additional IDs from inline scripts
                let allInlineScriptContent = pageData.inlineScripts.join('\n');
                const inlineAnalytics = extractAnalyticsFromScriptContent(allInlineScriptContent);

                // Merge results
                googleAnalytics.measurementIds.push(...inlineAnalytics.measurementIds);
                googleAnalytics.gtmContainers.push(...inlineAnalytics.gtmContainers);
                googleAnalytics.uaIds.push(...inlineAnalytics.uaIds);

                // Eliminar duplicados
                googleAnalytics.measurementIds = [...new Set(googleAnalytics.measurementIds)];
                googleAnalytics.gtmContainers = [...new Set(googleAnalytics.gtmContainers)];
                googleAnalytics.uaIds = [...new Set(googleAnalytics.uaIds)];

                // Actualizar flags según los IDs encontrados
                if (googleAnalytics.measurementIds.length > 0) googleAnalytics.hasGA4 = true;
                if (googleAnalytics.uaIds.length > 0) googleAnalytics.hasUniversalAnalytics = true;
                if (googleAnalytics.gtmContainers.length > 0) googleAnalytics.hasGTM = true;

                // Enviar resultado
                sendResult(url, {
                    headings: pageData.headings,
                    seoIssues,
                    accessibilityIssues,
                    brokenLinks,
                    totalLinksChecked: linkResults.length,
                    totalLinksFound: [...new Set(pageData.links)].length,
                    images: pageData.images,
                    scripts: pageData.scripts,
                    analytics: {
                        googleAnalytics,
                        // Search Console se envía en el GLOBAL_RESULT
                    }
                });

                sendLog(`✅ Completado: ${url}`);
            })(),

            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout de análisis (${settings.timeout / 1000}s)`)), settings.timeout))
        ]);

    } catch (error: any) {
        // Silent exit if aborted
        if (error.message === 'Aborted by user' || request.signal.aborted) {
            return;
        }

        console.error(`Error procesando ${url}:`, error);
        sendLog(`❌ Error en ${url}: ${error.message}`);

        sendResult(url, {
            error: error.message,
            accessibilityIssues: [],
            headings: [],
            seoIssues: [],
            brokenLinks: [],
            totalLinksChecked: 0,
            totalLinksFound: 0,
            images: [],
            scripts: []
        });
    } finally {
        // Limpieza de página
        if (page) {
            try { await page.close(); } catch (e) { console.error('Error cerrando página', e); }
        }
        // Limpieza de contexto (solo si no es compartido)
        if (CONTEXT_STRATEGY === 'per-url' && context) {
            try { await context.close(); } catch (e) { console.error('Error cerrando contexto', e); }
        }
    }
}

export async function POST(request: Request) {
    const { urls, settings: userSettings } = await request.json();

    const settings: AnalysisSettings = {
        concurrency: userSettings?.concurrency || DEFAULT_MAX_CONCURRENCY,
        timeout: userSettings?.timeout || DEFAULT_TIMEOUT,
        accessibilityStandard: userSettings?.accessibilityStandard || 'wcag2aa',
        bestPractices: userSettings?.bestPractices ?? true
    };

    // Construir etiquetas de accesibilidad de forma acumulativa
    const getCumulativeTags = (standard: string): string[] => {
        const tags: string[] = [];
        const levels = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
        const index = levels.indexOf(standard);

        if (index !== -1) {
            // Añadir todas las etiquetas hasta el nivel seleccionado
            for (let i = 0; i <= index; i++) {
                tags.push(levels[i]);
            }
        } else {
            tags.push('wcag2aa'); // Default fallback
        }
        return tags;
    };

    const accessibilityTags = getCumulativeTags(settings.accessibilityStandard);
    if (settings.bestPractices) {
        accessibilityTags.push('best-practice');
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'URLs array is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // INDICADOR PARA EVITAR DOBLE CIERRE
            let isControllerClosed = false;

            // MANEJAR SEÑAL DE ABORTO
            request.signal.addEventListener('abort', () => {
                isControllerClosed = true;
            });

            const safeClose = () => {
                if (!isControllerClosed && !request.signal.aborted) {
                    try { controller.close(); } catch (e) { console.error('Error cerrando controller:', e); }
                    isControllerClosed = true;
                }
            };

            const sendLog = (message: string) => {
                if (isControllerClosed || request.signal.aborted) return;
                const timestamp = new Date().toLocaleTimeString();
                try { controller.enqueue(encoder.encode(`LOG:${timestamp} ${message}\n`)); } catch (e) { }
            };
            const sendResult = (url: string, result: any) => {
                if (isControllerClosed || request.signal.aborted) return;
                try { controller.enqueue(encoder.encode(`RESULT:${JSON.stringify({ url, result })}\n`)); } catch (e) { }
            };
            const sendGlobalResult = (result: any) => {
                if (isControllerClosed || request.signal.aborted) return;
                try { controller.enqueue(encoder.encode(`GLOBAL_RESULT:${JSON.stringify(result)}\n`)); } catch (e) { }
            };

            let browser: Browser | null = null;
            let sharedContext: BrowserContext | null = null;
            const dnsCache = new Map<string, Promise<any[]>>();

            try {
                sendLog(`🚀 Iniciando análisis (${ANALYSIS_ENGINE}, Concurrency: ${settings.concurrency})...`);

                // 1. Lanzamiento del Navegador
                if (ANALYSIS_ENGINE === 'headless') {
                    try {
                        browser = await chromium.launch({
                            headless: true,
                            args: ['--no-sandbox', '--disable-setuid-sandbox']
                        });
                        sendLog('✅ Headless Browser lanzado.');
                    } catch (e: any) {
                        throw new Error(`Fallo al lanzar chromium headless: ${e.message}`);
                    }
                } else {
                    // CDP Fallback
                    try {
                        browser = await chromium.connectOverCDP('http://localhost:9222');
                        sendLog('✅ Conexión CDP establecida (Legacy Mode).');
                    } catch (err) {
                        throw new Error('No se pudo conectar vía CDP.');
                    }
                }

                // 2. Configuración de Contexto Compartido
                if (CONTEXT_STRATEGY === 'shared') {
                    if (ANALYSIS_ENGINE === 'cdp') {
                        sharedContext = browser.contexts()[0];
                    } else {
                        sharedContext = await browser.newContext();
                    }
                }

                // --- GLOBAL ANALYSIS PHASE ---
                sendLog('🌐 Analizando configuración global (DNS, Search Console)...');
                const firstUrl = urls[0];

                // Realizar una carga rápida de la primera URL para Search Console meta tags y Analytics
                const globalContext = sharedContext || await browser.newContext();
                const globalPage = await globalContext.newPage();
                let gscMeta: string | undefined;
                let globalAnalytics: any = { hasGA4: false, hasUniversalAnalytics: false, hasGTM: false, measurementIds: [], gtmContainers: [], uaIds: [] };

                try {
                    await globalPage.goto(firstUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    gscMeta = await globalPage.evaluate(() => {
                        const meta = document.querySelector('meta[name="google-site-verification"]');
                        return meta ? meta.getAttribute('content') : undefined;
                    }) || undefined;

                    const scripts = await globalPage.evaluate(() => {
                        return Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);
                    });
                    globalAnalytics = analyzeGoogleAnalytics(scripts);
                } catch (e) {
                    sendLog(`⚠️ Error en análisis global de página: ${(e as Error).message}`);
                } finally {
                    await globalPage.close();
                    if (!sharedContext) await globalContext.close();
                }

                const searchConsoleResult = await analyzeSearchConsole(firstUrl, gscMeta, dnsCache);
                sendGlobalResult({
                    analytics: {
                        googleAnalytics: globalAnalytics,
                        searchConsole: searchConsoleResult
                    }
                });
                sendLog('✅ Análisis global finalizado.');

                // 3. Ejecución de la Cola
                const limit = pLimit(settings.concurrency);
                const tasks = urls.map((url: string) => limit(() =>
                    analyzeSingleUrl(url, browser!, sharedContext, sendLog, sendResult, request, dnsCache, settings, accessibilityTags)
                ));

                await Promise.all(tasks);

                // Limpieza de Contexto Compartido
                if (CONTEXT_STRATEGY === 'shared' && sharedContext) {
                    try {
                        await sharedContext.close();
                        console.log('Shared context cerrado correctamente.');
                    } catch (e) {
                        console.error('Error cerrando shared context:', e);
                    }
                }

                // Finalizar si no se ha abortado
                if (!request.signal.aborted) {
                    sendLog('🏁 Todas las tareas completadas.');
                    safeClose();
                }

            } catch (error: any) {
                console.error('[SERVER ERROR]', error);

                // Enqueue error only if stream is still open and not aborted
                if (!isControllerClosed && !request.signal.aborted) {
                    try {
                        controller.enqueue(encoder.encode(`ERROR:${error.message}\n`));
                    } catch (e) { }
                    safeClose();
                }
            } finally {
                // Limpieza del Navegador
                if (browser) {
                    try {
                        if (ANALYSIS_ENGINE === 'headless') {
                            await browser.close();
                            console.log('Headless browser cerrado.');
                        }
                    } catch (e) {
                        console.error('Error cerrando browser:', e);
                    }
                }
            }
        }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } });
}
