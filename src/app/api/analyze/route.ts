
import { NextResponse } from 'next/server';
import { chromium, Browser, Page } from 'playwright-core';
import { AXE_CORE_SOURCE } from '@/lib/axe-constant';

export const dynamic = 'force-dynamic';

interface Heading {
    tag: string;
    text: string;
    level: number;
}

interface BrokenLink {
    link: string;
    status: number;
    ok: boolean;
    error?: string;
}

interface AxeViolation {
    id: string;
    impact: string;
    description: string; // Updated to match user's potential usage or keep existing
    nodes?: any[]; // Added to match user's debug logic
}

interface AnalysisResult {
    headings: Heading[];
    seoIssues: string[];
    accessibilityIssues: AxeViolation[];
    brokenLinks: BrokenLink[];
    totalLinksChecked: number;
    totalLinksFound: number;
    error?: string;
}

export async function POST(request: Request) {
    const { urls } = await request.json();

    // Validaciones básicas
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'URLs array is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // FUNCIÓN CLAVE: Logs duales (Terminal + Frontend)
            const sendLog = (message: string) => {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] 🔎 ${message} `); // <--- ESTO APARECERÁ EN TU TERMINAL
                try {
                    controller.enqueue(encoder.encode(`LOG:${message} \n`));
                } catch (e) { }
            };

            const sendResult = (url: string, result: any) => {
                try {
                    controller.enqueue(encoder.encode(`RESULT:${JSON.stringify({ url, ...result })} \n`));
                } catch (e) { }
            };

            let browser: Browser | null = null;

            try {
                sendLog('Iniciando conexión con Electron...');

                // Intentar conectar al puerto de depuración de Electron (9222)
                try {
                    browser = await chromium.connectOverCDP('http://localhost:9222');
                    sendLog('✅ Conexión CDP establecida exitosamente.');
                } catch (err) {
                    sendLog('⚠️ Falló conexión CDP. Intentando lanzar navegador headless (fallback)...');
                    browser = await chromium.launch({ headless: true });
                }

                // Get the main context or create new one
                const contexts = browser.contexts();
                let page: Page | undefined;

                if (contexts.length > 0) {
                    // Try to find hidden window
                    const pages = contexts[0].pages();
                    for (const p of pages) {
                        try {
                            const title = await p.title();
                            if (title === 'AnalysisWorker') {
                                page = p;
                                sendLog('Found hidden analysis worker window.');
                                break;
                            }
                        } catch (e) { }
                    }
                }

                if (!page) {
                    if (contexts.length === 0) {
                        const context = await browser.newContext();
                        page = await context.newPage();
                    } else {
                        page = await browser.newPage();
                    }
                }

                if (!page) throw new Error('No page available');

                // CRÍTICO: Escuchar lo que pasa DENTRO del navegador
                page.on('console', msg => console.log(`[BROWSER - INTERNAL] ${msg.type()}: ${msg.text()} `));
                page.on('pageerror', err => console.error(`[BROWSER - ERROR] ${err} `));

                for (const url of urls) {
                    try {
                        sendLog(`Analizando: ${url} `);

                        // 1. Navegación con timeout explícito
                        try {
                            await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
                        } catch (e) {
                            sendLog('Network idle timeout, falling back to load...');
                            await page.goto(url, { waitUntil: 'load', timeout: 45000 });
                        }

                        const status = 200; // Simplified status check since we are already loaded on the page
                        sendLog(`Navegación completada.`);

                        // 2. Verificación de contenido (¿Está vacía la página?)
                        const pageTitle = await page.title();
                        const htmlLength = await page.evaluate(() => document.body.innerHTML.length);
                        console.log(`[DEBUG] Título: "${pageTitle}" | Tamaño HTML: ${htmlLength} caracteres`);

                        if (htmlLength < 500) {
                            sendLog('⚠️ ALERTA: La página parece vacía. Posible bloqueo o error de carga.');
                        }

                        // 3. Scroll para Lazy Loading
                        sendLog('Ejecutando scroll automático...');
                        await page.evaluate(async () => {
                            await new Promise((resolve) => {
                                let totalHeight = 0;
                                const distance = 200;
                                const timer = setInterval(() => {
                                    const scrollHeight = document.body.scrollHeight;
                                    window.scrollBy(0, distance);
                                    totalHeight += distance;
                                    if (totalHeight >= scrollHeight) {
                                        clearInterval(timer);
                                        resolve(true);
                                    }
                                }, 100);
                            });
                        });
                        await page.waitForTimeout(1500); // Esperar renderizado post-scroll

                        // --- INSERTED SEO LOGIC START ---
                        sendLog('Checking SEO...');
                        const headingsRaw = await page.evaluate(`
    (() => {
        const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(elements).map(el => ({
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim() || '',
            level: parseInt(el.tagName.substring(1))
        }));
    })()
                        `) as any[];

                        const headings: Heading[] = headingsRaw.map(h => ({
                            tag: h.tag,
                            text: h.text,
                            level: h.level
                        }));

                        const seoIssues: string[] = [];
                        let previousLevel = 0;

                        headings.forEach((h, index) => {
                            if (index === 0) {
                                if (h.level !== 1) {
                                    seoIssues.push(`First heading is ${h.tag}, should be h1.`);
                                }
                            } else {
                                if (h.level > previousLevel + 1) {
                                    seoIssues.push(`Skipped heading level: ${previousLevel} -> ${h.level} (at "${h.text.substring(0, 30)}...")`);
                                }
                            }
                            previousLevel = h.level;
                        });

                        const h1Count = headings.filter(h => h.level === 1).length;
                        if (h1Count > 1) {
                            seoIssues.push(`Found ${h1Count} H1 tags.Recommended: 1.`);
                        }
                        if (h1Count === 0) {
                            seoIssues.push('No H1 tag found.');
                        }

                        if (!pageTitle || pageTitle.trim() === '') {
                            seoIssues.push('Page title is missing or empty.');
                        }

                        const metaDescription = await page.evaluate(`
    (() => {
        const meta = document.querySelector('meta[name="description"]');
        return meta ? meta.getAttribute('content') : null;
    })()
    `) as string | null;

                        if (!metaDescription) {
                            seoIssues.push('Meta description is missing.');
                        } else if (metaDescription.length < 50) {
                            seoIssues.push('Meta description is too short (< 50 chars).');
                        } else if (metaDescription.length > 160) {
                            seoIssues.push('Meta description is too long (> 160 chars).');
                        }
                        // --- INSERTED SEO LOGIC END ---

                        // 4. Inyección de Axe
                        sendLog('Inyectando Axe-Core (Static String)...');
                        await page.addScriptTag({ content: AXE_CORE_SOURCE });

                        // Verificar inyección antes de correr el análisis
                        const isAxeLoaded = await page.evaluate(() => typeof (window as any).axe !== 'undefined');
                        if (!isAxeLoaded) {
                            throw new Error('FATAL: window.axe sigue undefined tras inyección estática.');
                        }

                        // 5. Ejecución del análisis
                        sendLog('Ejecutando auditoría de accesibilidad...');
                        const axeResults = await page.evaluate(async () => {
                            // @ts-ignore
                            if (typeof window.axe === 'undefined') {
                                console.error('Axe no se cargó correctamente en window');
                                return { violations: [] };
                            }

                            // @ts-ignore
                            return await window.axe.run(document, {
                                runOnly: {
                                    type: 'tag',
                                    values: ['wcag2a', 'wcag2aa', 'best-practice']
                                },
                                resultTypes: ['violations']
                            });
                        }) as any; // Cast to any to handle raw results

                        console.log(`[DEBUG] Violaciones crudas recibidas: ${axeResults.violations?.length || 0} `);

                        // Si sigue dando 0, imprimimos qué detectó Axe para depurar
                        if (axeResults.violations.length === 0) {
                            const metadata = await page.evaluate(() => ({
                                images: document.querySelectorAll('img').length,
                                buttons: document.querySelectorAll('button').length
                            }));
                            console.log(`[DEBUG] Elementos en DOM: ${JSON.stringify(metadata)} `);
                        }

                        // Procesar resultados (Tu lógica original de mapeo)
                        const accessibilityIssues = axeResults.violations.map((v: any) => ({
                            id: v.id,
                            impact: v.impact,
                            description: v.description,
                            // nodes: v.nodes 
                            // Mapping only what matches interface or keep simple
                        }));

                        sendLog(`✅ Análisis finalizado.Violaciones encontradas: ${accessibilityIssues.length} `);

                        // --- INSERTED BROKEN LINK LOGIC START ---
                        const links = await page.evaluate(`
    (() => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:'));
    })()
    `) as string[];

                        const uniqueLinks = [...new Set(links)];
                        const linksToCheck = uniqueLinks.slice(0, 50);

                        const linkResults = await Promise.all(linksToCheck.map(async (link) => {
                            try {
                                const res = await fetch(link, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
                                return { link, status: res.status, ok: res.ok };
                            } catch (e) {
                                try {
                                    const res = await fetch(link, { method: 'GET', signal: AbortSignal.timeout(5000) });
                                    return { link, status: res.status, ok: res.ok };
                                } catch (e2) {
                                    return { link, status: 0, ok: false, error: 'Failed to fetch' };
                                }
                            }
                        }));

                        const brokenLinks = linkResults.filter(l => !l.ok);
                        // --- INSERTED BROKEN LINK LOGIC END ---

                        // Enviar al cliente
                        sendResult(url, {
                            headings,
                            seoIssues,
                            accessibilityIssues,
                            brokenLinks,
                            totalLinksChecked: linksToCheck.length,
                            totalLinksFound: uniqueLinks.length
                        });

                    } catch (error: any) {
                        console.error(`[ERROR CRÍTICO] Falló el análisis de ${url}: `, error);
                        sendLog(`Error fatal: ${error.message} `);
                        // Send empty result with error
                        sendResult(url, {
                            error: error.message,
                            headings: [],
                            seoIssues: [],
                            accessibilityIssues: [],
                            brokenLinks: [],
                            totalLinksChecked: 0,
                            totalLinksFound: 0
                        });
                    }
                }

                if (browser) await browser.close();
                controller.close();

            } catch (error: any) {
                console.error('[ERROR DE SERVIDOR]', error);
                if (browser) await browser.close(); // Ensure browser closes on top-level error
                try {
                    controller.enqueue(encoder.encode(`ERROR:${error.message} \n`));
                    controller.close();
                } catch (e) { }
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
        },
    });
}
