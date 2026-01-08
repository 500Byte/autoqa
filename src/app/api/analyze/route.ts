import { NextResponse } from 'next/server';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import pLimit from 'p-limit';
import { analyzeSeo } from '@/lib/analyzer/seo';
import { runAxeAnalysis } from '@/lib/analyzer/accessibility';
import { checkLinks } from '@/lib/analyzer/links';
import { analyzeGoogleAnalytics, extractAnalyticsFromScriptContent } from '@/lib/analyzer/analytics';
import { analyzeSearchConsole } from '@/lib/analyzer/searchconsole';

export const dynamic = 'force-dynamic';

// --- CONFIGURATION ---
const MAX_CONCURRENCY = 2; // Conservative start
const ANALYSIS_ENGINE: 'headless' | 'cdp' = 'headless'; // 'headless' (new, robust) or 'cdp' (legacy)
const CONTEXT_STRATEGY: 'shared' | 'per-url' = 'shared'; // 'shared' (faster) or 'per-url' (isolation)

// Helper to get or create context based on strategy
async function getContext(browser: Browser, existingContext: BrowserContext | null): Promise<BrowserContext> {
    if (CONTEXT_STRATEGY === 'shared') {
        if (existingContext) return existingContext;
        return await browser.newContext();
    }
    // Per-URL strategy creates a new context every time (caller must handle closing)
    return await browser.newContext();
}

// Logic for analyzing a single URL
async function analyzeSingleUrl(
    url: string,
    browser: Browser,
    sharedContext: BrowserContext | null,
    sendLog: (msg: string) => void,
    sendResult: (url: string, res: any) => void,
    request: Request,
    dnsCache: Map<string, Promise<any[]>>
) {
    if (request.signal.aborted) return;

    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
        sendLog(`▶️ Iniciando análisis: ${url}`);

        // Context Management
        if (CONTEXT_STRATEGY === 'shared') {
            // Re-use the shared batch context
            context = sharedContext!;
        } else {
            // Create a fresh context for this URL
            context = await getContext(browser, null);
        }

        // Create Page
        page = await context.newPage();

        // Check abort before heavy operations
        if (request.signal.aborted) throw new Error('Aborted by user');

        // TIMEOUT WRAPPER (30s)
        await Promise.race([
            (async () => {
                // Navigation
                try {
                    await page!.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
                } catch (e) {
                    if (request.signal.aborted) throw new Error('Aborted by user');
                    sendLog(`⚠️ Timeout idle en ${url}, reintentando con 'load'...`);
                    await page!.goto(url, { waitUntil: 'load', timeout: 20000 });
                }

                if (request.signal.aborted) throw new Error('Aborted by user');

                // Data Extraction
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

                    // Extract script sources for analytics detection
                    const scripts = Array.from(document.querySelectorAll('script[src]')).map(script =>
                        (script as HTMLScriptElement).src
                    );

                    // Extract inline scripts content for additional analytics detection
                    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])')).map(script =>
                        script.textContent || ''
                    );

                    // Extract Google Search Console meta tag
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

                // SEO Analysis
                const seoIssues = analyzeSeo({
                    headings: pageData.headings,
                    title: pageData.title,
                    metaDescription: pageData.metaDescription
                });

                // Lazy Load Scroll
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

                // Accessibility Analysis
                const accessibilityIssues = await runAxeAnalysis(page!);

                // Broken Links
                const linkResults = await checkLinks(pageData.links);
                const brokenLinks = linkResults.filter(l => !l.ok);

                // Analytics Detection
                const googleAnalytics = analyzeGoogleAnalytics(pageData.scripts);

                // Extract additional IDs from inline scripts
                let allInlineScriptContent = pageData.inlineScripts.join('\n');
                const inlineAnalytics = extractAnalyticsFromScriptContent(allInlineScriptContent);

                // Merge results
                googleAnalytics.measurementIds.push(...inlineAnalytics.measurementIds);
                googleAnalytics.gtmContainers.push(...inlineAnalytics.gtmContainers);
                googleAnalytics.uaIds.push(...inlineAnalytics.uaIds);

                // Remove duplicates
                googleAnalytics.measurementIds = [...new Set(googleAnalytics.measurementIds)];
                googleAnalytics.gtmContainers = [...new Set(googleAnalytics.gtmContainers)];
                googleAnalytics.uaIds = [...new Set(googleAnalytics.uaIds)];

                // Update flags based on found IDs
                if (googleAnalytics.measurementIds.length > 0) googleAnalytics.hasGA4 = true;
                if (googleAnalytics.uaIds.length > 0) googleAnalytics.hasUniversalAnalytics = true;
                if (googleAnalytics.gtmContainers.length > 0) googleAnalytics.hasGTM = true;

                // Search Console Detection
                const searchConsole = await analyzeSearchConsole(url, pageData.gscMetaContent || undefined, dnsCache);
                console.log(`[Route] Search Console result for ${url}:`, searchConsole);

                // Send Result
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
                        searchConsole
                    }
                });

                sendLog(`✅ Completado: ${url}`);
            })(),

            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de análisis (30s)')), 30000))
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
        // Cleanup Page
        if (page) {
            try { await page.close(); } catch (e) { console.error('Error cerrando página', e); }
        }
        // Cleanup Context (ONLY if per-url strategy)
        if (CONTEXT_STRATEGY === 'per-url' && context) {
            try { await context.close(); } catch (e) { console.error('Error cerrando contexto', e); }
        }
    }
}

export async function POST(request: Request) {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'URLs array is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // STATE FLAG TO PREVENT DOUBLE CLOSE
            let isControllerClosed = false;

            // HANDLE ABORT SIGNAL
            request.signal.addEventListener('abort', () => {
                isControllerClosed = true;
                // Note: We don't call controller.close() here because the stream is effectively dead/closed by the client
            });

            const safeClose = () => {
                if (!isControllerClosed && !request.signal.aborted) {
                    try { controller.close(); } catch (e) { console.error('Error closing controller:', e); }
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

            let browser: Browser | null = null;
            let sharedContext: BrowserContext | null = null;
            const dnsCache = new Map<string, Promise<any[]>>();

            try {
                sendLog(`🚀 Iniciando análisis (${ANALYSIS_ENGINE}, Concurrency: ${MAX_CONCURRENCY})...`);

                // 1. Browser Launch Strategy
                if (ANALYSIS_ENGINE === 'headless') {
                    // Try/Catch specific to launch
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

                // 2. Shared Context Setup (if applicable)
                if (CONTEXT_STRATEGY === 'shared') {
                    if (ANALYSIS_ENGINE === 'cdp') {
                        sharedContext = browser.contexts()[0];
                    } else {
                        sharedContext = await getContext(browser, null);
                    }
                }

                // 3. Queue Execution
                const limit = pLimit(MAX_CONCURRENCY);
                const tasks = urls.map((url: string) => limit(() =>
                    analyzeSingleUrl(url, browser!, sharedContext, sendLog, sendResult, request, dnsCache)
                ));

                await Promise.all(tasks);

                // Shared Context Cleanup
                if (CONTEXT_STRATEGY === 'shared' && sharedContext) {
                    try {
                        await sharedContext.close();
                        console.log('Shared context cerrado correctamente.');
                    } catch (e) {
                        console.error('Error cerrando shared context:', e);
                    }
                }

                // Only send Log and Close if NOT aborted
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
                // Cleanup Browser
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
