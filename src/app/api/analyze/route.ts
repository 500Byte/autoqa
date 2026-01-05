import { NextResponse } from 'next/server';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import pLimit from 'p-limit';
import { analyzeSeo } from '@/lib/analyzer/seo';
import { runAxeAnalysis } from '@/lib/analyzer/accessibility';
import { checkLinks } from '@/lib/analyzer/links';

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
    request: Request
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

        // TIMEOUT WRAPPER (30s)
        await Promise.race([
            (async () => {
                // Navigation
                try {
                    await page!.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
                } catch (e) {
                    sendLog(`⚠️ Timeout idle en ${url}, reintentando con 'load'...`);
                    await page!.goto(url, { waitUntil: 'load', timeout: 20000 });
                }

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

                    return { headings, links, images, title: document.title, metaDescription };
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

                // Accessibility Analysis
                const accessibilityIssues = await runAxeAnalysis(page!);

                // Broken Links
                const linkResults = await checkLinks(pageData.links);
                const brokenLinks = linkResults.filter(l => !l.ok);

                // Send Result
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

                sendLog(`✅ Completado: ${url}`);
            })(),

            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de análisis (30s)')), 30000))
        ]);

    } catch (error: any) {
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
            const sendLog = (message: string) => {
                const timestamp = new Date().toLocaleTimeString();
                try { controller.enqueue(encoder.encode(`LOG:${timestamp} ${message}\n`)); } catch (e) { }
            };
            const sendResult = (url: string, result: any) => {
                try { controller.enqueue(encoder.encode(`RESULT:${JSON.stringify({ url, result })}\n`)); } catch (e) { }
            };

            let browser: Browser | null = null;
            let sharedContext: BrowserContext | null = null;

            try {
                sendLog(`🚀 Iniciando análisis (${ANALYSIS_ENGINE}, Concurrency: ${MAX_CONCURRENCY})...`);

                // 1. Browser Launch Strategy
                if (ANALYSIS_ENGINE === 'headless') {
                    // Try/Catch specific to launch
                    try {
                        const executables = {
                            // Assuming standard paths or playwright-core finding it. 
                            // If completely failing, user might need to install browsers.
                            headless: true
                        };
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
                    analyzeSingleUrl(url, browser!, sharedContext, sendLog, sendResult, request)
                ));

                await Promise.all(tasks);

                sendLog('🏁 Todas las tareas completadas.');
                controller.close();

            } catch (error: any) {
                console.error('[CRITICAL SERVER ERROR]', error);
                try { controller.enqueue(encoder.encode(`ERROR:${error.message}\n`)); controller.close(); } catch (e) { }
            } finally {
                // Cleanup Browser
                if (browser) {
                    if (ANALYSIS_ENGINE === 'headless') {
                        await browser.close();
                        console.log('Browser cerrado gracefully.');
                    } else {
                        // CDP: Don't close the main browser!
                        if (!browser.isConnected()) await browser.close();
                    }
                }
            }
        }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } });
}
