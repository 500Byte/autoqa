import { NextResponse } from 'next/server';
import { normalizeUrl } from '@/lib/url-utils';

/**
 * Fetches and parses a sitemap or sitemap index XML.
 * Handles nested sitemaps recursively.
 *
 * @param sitemapUrl - The URL of the sitemap to fetch.
 * @param depth - Current recursion depth to prevent infinite loops.
 * @returns Array of page URLs extracted from the sitemap(s).
 */
async function fetchAndParseSitemap(sitemapUrl: string, depth = 0): Promise<string[]> {
    if (depth > 5) return []; // Limit recursion

    try {
        const response = await fetch(sitemapUrl, {
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': 'AutoQA-Bot/1.0'
            }
        });

        if (!response.ok) {
            return [];
        }

        const xmlText = await response.text();

        // Extract URLs using a more robust regex that handles CDATA and potential namespaces
        const extractLocs = (xml: string) => {
            const locRegex = /<loc>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/gi;
            const matches = [];
            let match;
            while ((match = locRegex.exec(xml)) !== null) {
                if (match[1]) matches.push(match[1].trim());
            }
            return matches;
        };

        const isSitemapIndex = xmlText.includes('<sitemap>') || xmlText.includes('<sitemapindex>');

        if (isSitemapIndex) {
            const sitemapUrls = extractLocs(xmlText);
            const allUrls: string[] = [];

            // Limit number of nested sitemaps to process to avoid timeouts
            const limitedSitemaps = sitemapUrls.slice(0, 50);

            for (const url of limitedSitemaps) {
                try {
                    const urls = await fetchAndParseSitemap(url, depth + 1);
                    allUrls.push(...urls);
                } catch (error) {
                    console.error(`Failed to fetch nested sitemap ${url}:`, error);
                }
            }

            return allUrls;
        } else {
            return extractLocs(xmlText);
        }
    } catch (error) {
        console.error(`Error fetching sitemap ${sitemapUrl}:`, error);
        return [];
    }
}

/**
 * Attempts to find sitemap URLs from robots.txt.
 *
 * @param baseUrl - The base URL of the website.
 * @returns Array of sitemap URLs found in robots.txt.
 */
async function getSitemapsFromRobots(baseUrl: string): Promise<string[]> {
    try {
        const robotsUrl = `${baseUrl}/robots.txt`;
        const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return [];

        const text = await response.text();
        const sitemapLines = text.split('\n').filter(line => line.toLowerCase().startsWith('sitemap:'));

        return sitemapLines.map(line => line.split(/sitemap:/i)[1].trim());
    } catch {
        return [];
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
        const baseUrl = normalizeUrl(url);

        // Strategy 1: Check robots.txt
        const sitemapsFromRobots = await getSitemapsFromRobots(baseUrl);

        // Strategy 2: Common locations
        const commonLocations = [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/sitemap_index.xml`,
            `${baseUrl}/sitemap/sitemap.xml`,
            `${baseUrl}/sitemap/index.xml`,
            `${baseUrl}/sitemap-index.xml`,
        ];

        const candidateSitemaps = [...new Set([...sitemapsFromRobots, ...commonLocations])];

        let allUrls: string[] = [];
        let discoveredSitemap = '';

        for (const sitemapUrl of candidateSitemaps) {
            const urls = await fetchAndParseSitemap(sitemapUrl);
            if (urls.length > 0) {
                allUrls = urls;
                discoveredSitemap = sitemapUrl;
                break;
            }
        }

        if (allUrls.length === 0) {
            return NextResponse.json({ error: 'No sitemap found or sitemap is empty' }, { status: 404 });
        }

        // Clean and filter URLs
        const uniqueUrls = [...new Set(allUrls)];
        const pageUrls = uniqueUrls.filter(url => {
            try {
                const u = new URL(url);
                const isXmlOrXsl = u.pathname.endsWith('.xml') || u.pathname.endsWith('.xsl');
                const isImage = /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(u.pathname);
                const isPdf = u.pathname.endsWith('.pdf');
                return !isXmlOrXsl && !isImage && !isPdf;
            } catch {
                return false;
            }
        });

        return NextResponse.json({
            urls: pageUrls.slice(0, 500), // Limit total URLs to 500 for safety
            count: pageUrls.length,
            sitemapUrl: discoveredSitemap,
            totalFound: pageUrls.length
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
