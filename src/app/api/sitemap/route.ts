import { NextResponse } from 'next/server';

/**
 * Fetches and parses a sitemap or sitemap index XML.
 * Handles nested sitemaps recursively.
 *
 * @param sitemapUrl - The URL of the sitemap to fetch.
 * @returns Array of page URLs extracted from the sitemap(s).
 */
async function fetchAndParseSitemap(sitemapUrl: string): Promise<string[]> {
    const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${sitemapUrl}`);
    }

    const xmlText = await response.text();

    // Verificar si es un índice de sitemaps
    const isSitemapIndex = xmlText.includes('<sitemap>') || xmlText.includes('<sitemapindex>');

    if (isSitemapIndex) {
        // Extraer URLs de sitemaps del índice
        const sitemapMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);

        if (!sitemapMatches) {
            return [];
        }

        const sitemapUrls = sitemapMatches.map(match => {
            return match.replace(/<\/?loc>/g, '').trim();
        });

        // Obtener recursivamente todas las URLs
        const allUrls: string[] = [];
        for (const url of sitemapUrls) {
            try {
                const urls = await fetchAndParseSitemap(url);
                allUrls.push(...urls);
            } catch (error) {
                console.error(`Failed to fetch nested sitemap ${url}:`, error);
            }
        }

        return allUrls;
    } else {
        // Sitemap regular, extraer URLs de páginas
        const urlMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);

        if (!urlMatches) {
            return [];
        }

        return urlMatches.map(match => {
            return match.replace(/<\/?loc>/g, '').trim();
        });
    }
}

/**
 * API route to detect and fetch URLs from a website's sitemap.
 *
 * @param request - Incoming HTTP request.
 * @returns JSON response with detected URLs and sitemap location.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        // TODO: consider extracting domain/URL normalization logic
        // Normalizar URL
        let baseUrl = url;
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'https://' + baseUrl;
        }
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // Intentar obtener sitemap.xml
        let sitemapUrl = `${baseUrl}/sitemap.xml`;
        let allUrls: string[] = [];

        try {
            allUrls = await fetchAndParseSitemap(sitemapUrl);
        } catch {
            // Si falla sitemap.xml, intentar sitemap_index.xml
            sitemapUrl = `${baseUrl}/sitemap_index.xml`;
            try {
                allUrls = await fetchAndParseSitemap(sitemapUrl);
            } catch {
                return NextResponse.json({ error: 'Sitemap not found' }, { status: 404 });
            }
        }

        if (allUrls.length === 0) {
            return NextResponse.json({ error: 'No URLs found in sitemap' }, { status: 404 });
        }

        // Eliminar duplicados
        const uniqueUrls = [...new Set(allUrls)];

        // Filtrar URLs que no sean páginas
        const pageUrls = uniqueUrls.filter(url => {
            return !url.endsWith('.xml') && !url.endsWith('.xsl');
        });

        return NextResponse.json({
            urls: pageUrls,
            count: pageUrls.length,
            sitemapUrl
        });

    } catch (error: unknown) {
        const err = error as Error;
        console.error(err);
        return NextResponse.json({
            error: 'Failed to fetch sitemap',
            details: err.message
        }, { status: 500 });
    }
}
