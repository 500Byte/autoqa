import { NextResponse } from 'next/server';
import { chromium, Browser, Page } from 'playwright-core';
// Importación de la constante estática de Axe que ya resolvió el error 'b is not defined'
import { AXE_CORE_SOURCE } from '@/lib/axe-constant';

export const dynamic = 'force-dynamic';

// --- Interfaces ---
interface Heading { tag: string; text: string; level: number; }
interface BrokenLink { link: string; status: number; ok: boolean; error?: string; }
interface AxeViolation { id: string; impact: string; description: string; nodes?: any[]; }

export async function POST(request: Request) {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'URLs array is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendLog = (message: string) => {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] 🔎 ${message}`);
                try { controller.enqueue(encoder.encode(`LOG:${message}\n`)); } catch (e) { }
            };
            const sendResult = (url: string, result: any) => {
                try { controller.enqueue(encoder.encode(`RESULT:${JSON.stringify({ url, result })}\n`)); } catch (e) { }
            };

            let browser: Browser | null = null;
            let page: Page | null = null;

            try {
                sendLog(`🚀 Iniciando análisis completo de ${urls.length} URLs...`);

                // 1. Conexión CDP Estable
                try {
                    browser = await chromium.connectOverCDP('http://localhost:9222');
                    sendLog('✅ Conexión CDP establecida.');
                } catch (err) {
                    sendLog('⚠️ Falló conexión CDP. Lanzando headless fallback...');
                    browser = await chromium.launch({ headless: true });
                }

                const defaultContext = browser.contexts()[0];
                if (!defaultContext) throw new Error('No se encontró el contexto de Electron.');

                const pages = defaultContext.pages();
                page = pages.find(p => {
                    try {
                        const url = p.url();
                        return url.includes('AnalysisWorker') || url.includes('about:blank');
                    } catch (e) { return false; }
                }) || pages[0];

                if (!page) throw new Error('No se encontró ventana de análisis.');
                sendLog('✅ Worker vinculado.');

                let processedCount = 0;

                for (const url of urls) {
                    // Check if the request has been aborted by the user
                    if (request.signal.aborted) {
                        sendLog('🛑 Análisis cancelado por el usuario (AbortSignal recibida).');
                        break;
                    }

                    try {
                        processedCount++;
                        sendLog(`[${processedCount}/${urls.length}] Analizando: ${url}`);

                        // 1. Navegación
                        try {
                            await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
                        } catch (e) {
                            sendLog('Timeout idle, usando load...');
                            await page.goto(url, { waitUntil: 'load', timeout: 45000 });
                        }

                        // 2. Extracción de Datos SEO / Estructura (Evita crash en Frontend)
                        const pageData = await page.evaluate(() => {
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

                            return { headings, links, images };
                        });

                        // Lógica SEO básica
                        const seoIssues: string[] = [];
                        let previousLevel = 0;
                        pageData.headings.forEach((h, index) => {
                            if (index === 0) {
                                if (h.level !== 1) seoIssues.push(`First heading is ${h.tag}, should be h1.`);
                            } else {
                                if (h.level > previousLevel + 1) {
                                    seoIssues.push(`Skipped level: ${previousLevel} -> ${h.level} (at "${h.text.substring(0, 30)}...")`);
                                }
                            }
                            previousLevel = h.level;
                        });

                        const h1Count = pageData.headings.filter(h => h.level === 1).length;
                        if (h1Count > 1) seoIssues.push(`Found ${h1Count} H1 tags.`);
                        if (h1Count === 0) seoIssues.push('No H1 tag found.');

                        const pageTitle = await page.title();
                        if (!pageTitle) seoIssues.push('Page title is missing.');

                        const metaDescription = await page.evaluate(`
                            (() => {
                                const meta = document.querySelector('meta[name="description"]');
                                return meta ? meta.getAttribute('content') : null;
                            })()
                        `) as string | null;

                        if (!metaDescription) {
                            seoIssues.push('Meta description is missing.');
                        } else if (metaDescription.length < 50) {
                            seoIssues.push('Meta description is too short.');
                        } else if (metaDescription.length > 160) {
                            seoIssues.push('Meta description is too long.');
                        }

                        // 3. Scroll para Lazy Load
                        await page.evaluate(async () => {
                            await new Promise((resolve) => {
                                let totalHeight = 0;
                                const distance = 400;
                                const timer = setInterval(() => {
                                    const scrollHeight = document.body.scrollHeight;
                                    window.scrollBy(0, distance);
                                    totalHeight += distance;
                                    if (totalHeight >= scrollHeight) {
                                        clearInterval(timer);
                                        resolve(true);
                                    }
                                }, 50);
                            });
                        });
                        await page.waitForTimeout(500);

                        // 4. Inyección y Ejecución de Axe
                        await page.addScriptTag({ content: AXE_CORE_SOURCE });
                        const axeResults = await page.evaluate(async () => {
                            // @ts-ignore
                            if (typeof window.axe === 'undefined') return { violations: [] };
                            // @ts-ignore
                            return await window.axe.run(document, {
                                runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
                                resultTypes: ['violations']
                            });
                        }) as any;

                        const accessibilityIssues = axeResults.violations.map((v: any) => ({
                            id: v.id,
                            impact: v.impact,
                            description: v.description,
                            nodes: v.nodes
                        }));

                        // 5. Broken Links (Check de los primeros 20 para velocidad)
                        const uniqueLinks = [...new Set(pageData.links)];
                        const linksToCheck = uniqueLinks.slice(0, 20);
                        const linkResults = await Promise.all(linksToCheck.map(async (link) => {
                            try {
                                const res = await fetch(link, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                                return { link, status: res.status, ok: res.ok };
                            } catch (e) {
                                return { link, status: 0, ok: false, error: 'Failed' };
                            }
                        }));
                        const brokenLinks = linkResults.filter(l => !l.ok);

                        // Construcción del objeto RESULTADO COMPLETO (Satisface al Frontend)
                        sendResult(url, {
                            headings: pageData.headings,
                            seoIssues,
                            accessibilityIssues,
                            brokenLinks,
                            totalLinksChecked: linksToCheck.length,
                            totalLinksFound: uniqueLinks.length,
                            images: pageData.images, // Requerido por UI
                            scripts: []              // Requerido por UI
                        });

                        sendLog(`✅ OK: ${url} (${accessibilityIssues.length} violaciones)`);

                    } catch (error: any) {
                        console.error(`Error en ${url}:`, error);
                        sendLog(`❌ Falló ${url}: ${error.message}`);

                        // Enviar esquema completo incluso en error para evitar Pantalla Blanca
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

                        try { if (page) await page.goto('about:blank'); } catch (e) { }
                    }
                }

                sendLog('🏁 Análisis completo.');
                if (page) try { await page.goto('about:blank'); } catch (e) { }
                if (browser) await browser.close();
                controller.close();

            } catch (error: any) {
                console.error('[CRITICAL SERVER ERROR]', error);
                if (browser) await browser.close();
                try { controller.enqueue(encoder.encode(`ERROR:${error.message}\n`)); controller.close(); } catch (e) { }
            }
        }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } });
}
