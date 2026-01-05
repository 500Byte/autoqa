import { NextResponse } from 'next/server';
import { chromium, Browser, Page } from 'playwright-core';
import { analyzeSeo } from '@/lib/analyzer/seo';
import { runAxeAnalysis } from '@/lib/analyzer/accessibility';
import { checkLinks } from '@/lib/analyzer/links';
import { Heading } from '@/types';

export const dynamic = 'force-dynamic';

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

                        // 2. Extracción de Datos (Headings, Title, Meta, Links, Images)
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

                            const meta = document.querySelector('meta[name="description"]');
                            const metaDescription = meta ? meta.getAttribute('content') : null;

                            return { headings, links, images, title: document.title, metaDescription };
                        });

                        // 3. Análisis SEO
                        const seoIssues = analyzeSeo({
                            headings: pageData.headings,
                            title: pageData.title,
                            metaDescription: pageData.metaDescription
                        });

                        // 4. Scroll para Lazy Load (Keep mostly original)
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

                        // 5. Análisis Accesibilidad
                        const accessibilityIssues = await runAxeAnalysis(page);

                        // 6. Broken Links
                        const linkResults = await checkLinks(pageData.links);
                        const brokenLinks = linkResults.filter(l => !l.ok);

                        // Enviar Resultados
                        sendResult(url, {
                            headings: pageData.headings,
                            seoIssues,
                            accessibilityIssues,
                            brokenLinks,
                            totalLinksChecked: linkResults.length,
                            totalLinksFound: [...new Set(pageData.links)].length,
                            images: pageData.images,
                            scripts: []
                        });

                        sendLog(`✅ OK: ${url} (${accessibilityIssues.length} violaciones)`);

                    } catch (error: any) {
                        console.error(`Error en ${url}:`, error);
                        sendLog(`❌ Falló ${url}: ${error.message}`);

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
