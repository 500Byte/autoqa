import { GoogleAnalyticsData } from "@/types";

export function analyzeGoogleAnalytics(scripts: string[]): GoogleAnalyticsData {
    const measurementIds: string[] = [];
    const gtmContainers: string[] = [];
    const uaIds: string[] = [];

    let hasGA4 = false;
    let hasUniversalAnalytics = false;
    let hasGTM = false;

    // Verificar cada URL de script
    scripts.forEach(scriptSrc => {
        // Detección de GA4 (gtag.js)
        if (scriptSrc.includes('googletagmanager.com/gtag/js')) {
            hasGA4 = true;

            // Extraer ID de medición de la URL
            const idMatch = scriptSrc.match(/[?&]id=(G-[A-Z0-9]+)/i);
            if (idMatch && idMatch[1]) {
                measurementIds.push(idMatch[1]);
            }
        }

        // Detección de Universal Analytics (obsoleto)
        if (scriptSrc.includes('google-analytics.com/analytics.js')) {
            hasUniversalAnalytics = true;
        }

        // Detección de Google Tag Manager (gtm.js)
        if (scriptSrc.includes('googletagmanager.com/gtm.js')) {
            hasGTM = true;

            // Extraer ID de contenedor GTM de la URL
            const gtmMatch = scriptSrc.match(/[?&]id=(GTM-[A-Z0-9]+)/i);
            if (gtmMatch && gtmMatch[1]) {
                gtmContainers.push(gtmMatch[1]);
            }
        }
    });

    return {
        hasGA4,
        hasUniversalAnalytics,
        hasGTM,
        measurementIds: [...new Set(measurementIds)],
        gtmContainers: [...new Set(gtmContainers)],
        uaIds: [...new Set(uaIds)]
    };
}

/**
 * Extraer IDs de GA/GTM de scripts inline
 */
export function extractAnalyticsFromScriptContent(scriptContent: string): {
    measurementIds: string[];
    gtmContainers: string[];
    uaIds: string[];
} {
    const measurementIds: string[] = [];
    const gtmContainers: string[] = [];
    const uaIds: string[] = [];

    // Extraer IDs de GA4 (G-XXXXXXXXXX)
    const ga4Pattern = /['"]G-[A-Z0-9]{10,}['"]/gi;
    const ga4Matches = scriptContent.match(ga4Pattern);
    if (ga4Matches) {
        ga4Matches.forEach(match => {
            const cleanId = match.replace(/['"]/g, '');
            measurementIds.push(cleanId);
        });
    }

    // Extraer IDs de GTM (GTM-XXXXXXX)
    const gtmPattern = /['"]GTM-[A-Z0-9]{7,}['"]/gi;
    const gtmMatches = scriptContent.match(gtmPattern);
    if (gtmMatches) {
        gtmMatches.forEach(match => {
            const cleanId = match.replace(/['"]/g, '');
            gtmContainers.push(cleanId);
        });
    }

    // Extraer IDs de Universal Analytics (UA-XXXXXXXX-X)
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
