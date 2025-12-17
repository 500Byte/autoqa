import { NextResponse } from 'next/server';

async function fetchAndParseSitemap(sitemapUrl: string): Promise<string[]> {
    const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${sitemapUrl}`);
    }

    const xmlText = await response.text();

    // Check if this is a sitemap index (contains <sitemap> tags)
    const isSitemapIndex = xmlText.includes('<sitemap>') || xmlText.includes('<sitemapindex>');

    if (isSitemapIndex) {
        // Extract sitemap URLs from the index
        const sitemapMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);

        if (!sitemapMatches) {
            return [];
        }

        const sitemapUrls = sitemapMatches.map(match => {
            return match.replace(/<\/?loc>/g, '').trim();
        });

        // Recursively fetch all sitemaps
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
        // This is a regular sitemap, extract page URLs
        const urlMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);

        if (!urlMatches) {
            return [];
        }

        return urlMatches.map(match => {
            return match.replace(/<\/?loc>/g, '').trim();
        });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        // Normalize URL
        let baseUrl = url;
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'https://' + baseUrl;
        }
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // Try to fetch sitemap.xml
        let sitemapUrl = `${baseUrl}/sitemap.xml`;
        let allUrls: string[] = [];

        try {
            allUrls = await fetchAndParseSitemap(sitemapUrl);
        } catch (error) {
            // If sitemap.xml fails, try sitemap_index.xml
            sitemapUrl = `${baseUrl}/sitemap_index.xml`;
            try {
                allUrls = await fetchAndParseSitemap(sitemapUrl);
            } catch (error2) {
                return NextResponse.json({ error: 'Sitemap not found' }, { status: 404 });
            }
        }

        if (allUrls.length === 0) {
            return NextResponse.json({ error: 'No URLs found in sitemap' }, { status: 404 });
        }

        // Remove duplicates
        const uniqueUrls = [...new Set(allUrls)];

        // Filter out non-page URLs (like other XML files)
        const pageUrls = uniqueUrls.filter(url => {
            return !url.endsWith('.xml') && !url.endsWith('.xsl');
        });

        return NextResponse.json({
            urls: pageUrls,
            count: pageUrls.length,
            sitemapUrl
        });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({
            error: 'Failed to fetch sitemap',
            details: error.message
        }, { status: 500 });
    }
}
