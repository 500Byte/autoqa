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

/**
 * Escanear todo el HTML para encontrar IDs incluso si los scripts fueron bloqueados o modificados
 */
export function extractAnalyticsFromHtmlContent(htmlContent: string): {
    measurementIds: string[];
    gtmContainers: string[];
    uaIds: string[];
} {
    const measurementIds: string[] = [];
    const gtmContainers: string[] = [];
    const uaIds: string[] = [];

    // Buscar patrones de GTM en iframes (noscript)
    // <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
    const iframeGtmPattern = /googletagmanager\.com\/ns\.html\?id=(GTM-[A-Z0-9]+)/gi;
    let match;
    while ((match = iframeGtmPattern.exec(htmlContent)) !== null) {
        if (match[1]) gtmContainers.push(match[1]);
    }

    // Buscar patrones generales en todo el texto (fallback agresivo)
    // Útil cuando el código está comentado o dentro de configuraciones JSON

    // GA4
    const ga4Pattern = /\b(G-[A-Z0-9]{10,})\b/g;
    while ((match = ga4Pattern.exec(htmlContent)) !== null) {
        // Validar que parece un ID real (evitar falsos positivos simples)
        if (match[1]) measurementIds.push(match[1]);
    }

    // GTM
    const gtmPattern = /\b(GTM-[A-Z0-9]{7,})\b/g;
    while ((match = gtmPattern.exec(htmlContent)) !== null) {
        if (match[1]) gtmContainers.push(match[1]);
    }

    // Universal Analytics
    const uaPattern = /\b(UA-\d{4,10}-\d{1,4})\b/g;
    while ((match = uaPattern.exec(htmlContent)) !== null) {
        if (match[1]) uaIds.push(match[1]);
    }

    // --- Complianz & Blocked Scripts Specifics ---

    // data-cmplz-src="...id=G-XXXXX..."
    const cmplzPattern = /data-cmplz-src=["']([^"']+)["']/g;
    while ((match = cmplzPattern.exec(htmlContent)) !== null) {
        const src = match[1];
        // Check for GA4 in src
        const gaMatch = src.match(/id=(G-[A-Z0-9]+)/);
        if (gaMatch && gaMatch[1]) measurementIds.push(gaMatch[1]);

        // Check for GTM in src
        const gtmMatch = src.match(/id=(GTM-[A-Z0-9]+)/);
        if (gtmMatch && gtmMatch[1]) gtmContainers.push(gtmMatch[1]);
    }

    // Scripts with type="text/plain" (cookie blockers often use this)
    // We look for patterns inside specifically to catch those that might be skipped by loose regex if they are encoded or oddly spaced
    const textPlainScriptPattern = /<script[^>]*type=["']text\/plain["'][^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = textPlainScriptPattern.exec(htmlContent)) !== null) {
        const content = match[1];
        // Scan content for IDs
        const innerImgIds = content.match(/G-[A-Z0-9]{10,}/g);
        if (innerImgIds) measurementIds.push(...innerImgIds);

        const innerGtmIds = content.match(/GTM-[A-Z0-9]{7,}/g);
        if (innerGtmIds) gtmContainers.push(...innerGtmIds);
    }

    return {
        measurementIds: [...new Set(measurementIds)],
        gtmContainers: [...new Set(gtmContainers)],
        uaIds: [...new Set(uaIds)]
    };
}

/**
 * Realiza un escaneo completo de analíticas combinando todas las técnicas disponibles
 */
export function comprehensiveAnalyticsScan(
    scripts: string[],
    inlineScripts: string[],
    htmlContent: string
): GoogleAnalyticsData {
    // 1. Detección base desde URLs de scripts
    const baseAnalytics = analyzeGoogleAnalytics(scripts);

    // 2. Extracción desde scripts inline
    const inlineContent = inlineScripts.join('\n');
    const inlineAnalytics = extractAnalyticsFromScriptContent(inlineContent);

    // 3. Extracción desde el HTML completo (fallback agresivo)
    const htmlAnalytics = extractAnalyticsFromHtmlContent(htmlContent);

    // Mezclar todos los IDs encontrados
    const allMeasurementIds = [
        ...baseAnalytics.measurementIds,
        ...inlineAnalytics.measurementIds,
        ...htmlAnalytics.measurementIds
    ];

    const allGtmContainers = [
        ...baseAnalytics.gtmContainers,
        ...inlineAnalytics.gtmContainers,
        ...htmlAnalytics.gtmContainers
    ];

    const allUaIds = [
        ...baseAnalytics.uaIds,
        ...inlineAnalytics.uaIds,
        ...htmlAnalytics.uaIds
    ];

    // Limpiar duplicados
    const uniqueMeasurementIds = [...new Set(allMeasurementIds)];
    const uniqueGtmContainers = [...new Set(allGtmContainers)];
    const uniqueUaIds = [...new Set(allUaIds)];

    return {
        hasGA4: uniqueMeasurementIds.length > 0 || baseAnalytics.hasGA4,
        hasUniversalAnalytics: uniqueUaIds.length > 0 || baseAnalytics.hasUniversalAnalytics,
        hasGTM: uniqueGtmContainers.length > 0 || baseAnalytics.hasGTM,
        measurementIds: uniqueMeasurementIds,
        gtmContainers: uniqueGtmContainers,
        uaIds: uniqueUaIds
    };
}

