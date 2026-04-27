/**
 * Response from the sitemap detection API.
 */
export interface SitemapResponse {
    urls: string[];
    count: number;
    sitemapUrl: string;
    error?: string;
}

/**
 * Represents an HTML heading element.
 */
export interface Heading {
    tag: string;
    text: string;
    level: number;
}

/**
 * Represents a link that was checked for validity.
 */
export interface BrokenLink {
    link: string;
    status: number;
    ok: boolean;
    error?: string;
}

/**
 * Represents a node affected by an accessibility violation.
 */
export interface AxeNode {
    html: string;
    target: string[];
    failureSummary: string;
}

/**
 * Represents an accessibility violation found by Axe.
 */
export interface AxeViolation {
    id: string;
    impact: string;
    description: string;
    nodes: AxeNode[];
}

/**
 * Data regarding Google Analytics detection on a page.
 */
export interface GoogleAnalyticsData {
    hasGA4: boolean;
    hasUniversalAnalytics: boolean;
    hasGTM: boolean;
    measurementIds: string[];
    gtmContainers: string[];
    uaIds: string[];
}

/**
 * Data regarding Google Search Console verification on a page.
 */
export interface SearchConsoleData {
    hasMetaTag: boolean;
    metaTagContent?: string;
    hasHtmlFile: boolean;
    hasDnsTxt: boolean;
    dnsTxtContent?: string;
}

/**
 * Combined analytics and verification data.
 */
export interface AnalyticsData {
    googleAnalytics: GoogleAnalyticsData;
    searchConsole: SearchConsoleData;
}

/**
 * Result of a comprehensive page analysis.
 */
export interface AnalysisResult {
    url: string;
    headings: Heading[];
    seoIssues: string[];
    accessibilityIssues: AxeViolation[];
    brokenLinks: BrokenLink[];
    totalLinksChecked: number;
    totalLinksFound: number;
    error?: string;
    images?: { src: string; alt: string }[];
    scripts?: string[];
    analytics?: AnalyticsData;
    screenshots?: {
        mobile: string;
        tablet: string;
        desktop: string;
    };
}

/**
 * User-configurable settings for the analysis process.
 */
export interface AnalysisSettings {
    concurrency: number;
    timeout: number;
    accessibilityStandard: string;
    bestPractices: boolean;
}
