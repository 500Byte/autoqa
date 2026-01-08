import { GoogleAnalyticsData } from "@/types";

export function analyzeGoogleAnalytics(scripts: string[]): GoogleAnalyticsData {
    const measurementIds: string[] = [];
    const gtmContainers: string[] = [];
    const uaIds: string[] = [];

    let hasGA4 = false;
    let hasUniversalAnalytics = false;
    let hasGTM = false;

    // Check each script URL
    scripts.forEach(scriptSrc => {
        // GA4 Detection (gtag.js)
        if (scriptSrc.includes('googletagmanager.com/gtag/js')) {
            hasGA4 = true;

            // Extract measurement ID from URL (e.g., ?id=G-XXXXXXXXXX)
            const idMatch = scriptSrc.match(/[?&]id=(G-[A-Z0-9]+)/i);
            if (idMatch && idMatch[1]) {
                measurementIds.push(idMatch[1]);
            }
        }

        // Universal Analytics Detection (analytics.js - deprecated)
        if (scriptSrc.includes('google-analytics.com/analytics.js')) {
            hasUniversalAnalytics = true;
        }

        // Google Tag Manager Detection (gtm.js)
        if (scriptSrc.includes('googletagmanager.com/gtm.js')) {
            hasGTM = true;

            // Extract GTM container ID from URL (e.g., ?id=GTM-XXXXXXX)
            const gtmMatch = scriptSrc.match(/[?&]id=(GTM-[A-Z0-9]+)/i);
            if (gtmMatch && gtmMatch[1]) {
                gtmContainers.push(gtmMatch[1]);
            }
        }
    });

    // Additional pattern matching in script content (if needed)
    // Note: This requires script content, not just URLs
    // We can enhance this later if we extract inline script content

    return {
        hasGA4,
        hasUniversalAnalytics,
        hasGTM,
        measurementIds: [...new Set(measurementIds)], // Remove duplicates
        gtmContainers: [...new Set(gtmContainers)],
        uaIds: [...new Set(uaIds)]
    };
}

/**
 * Extract GA/GTM IDs from inline script content
 * This can be called separately if script content is available
 */
export function extractAnalyticsFromScriptContent(scriptContent: string): {
    measurementIds: string[];
    gtmContainers: string[];
    uaIds: string[];
} {
    const measurementIds: string[] = [];
    const gtmContainers: string[] = [];
    const uaIds: string[] = [];

    // Extract GA4 Measurement IDs (G-XXXXXXXXXX)
    const ga4Pattern = /['"]G-[A-Z0-9]{10,}['"]/gi;
    const ga4Matches = scriptContent.match(ga4Pattern);
    if (ga4Matches) {
        ga4Matches.forEach(match => {
            const cleanId = match.replace(/['"]/g, '');
            measurementIds.push(cleanId);
        });
    }

    // Extract GTM Container IDs (GTM-XXXXXXX)
    const gtmPattern = /['"]GTM-[A-Z0-9]{7,}['"]/gi;
    const gtmMatches = scriptContent.match(gtmPattern);
    if (gtmMatches) {
        gtmMatches.forEach(match => {
            const cleanId = match.replace(/['"]/g, '');
            gtmContainers.push(cleanId);
        });
    }

    // Extract Universal Analytics IDs (UA-XXXXXXXX-X)
    const uaPattern = /['"]UA-\d{4,10}-\d{1,4}['"]/gi;
    const uaMatches = scriptContent.match(uaPattern);
    if (uaMatches) {
        uaMatches.forEach(match => {
            const cleanId = match.replace(/['"]/g, '');
            uaIds.push(cleanId);
        });
    }

    return {
        measurementIds: [...new Set(measurementIds)],
        gtmContainers: [...new Set(gtmContainers)],
        uaIds: [...new Set(uaIds)]
    };
}
