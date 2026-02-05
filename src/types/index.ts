export interface SitemapResponse {
    urls: string[];
    count: number;
    sitemapUrl: string;
    error?: string;
}

export interface Heading {
    tag: string;
    text: string;
    level: number;
}

export interface BrokenLink {
    link: string;
    status: number;
    ok: boolean;
    error?: string;
}

export interface AxeViolation {
    id: string;
    impact: string;
    description: string;
    nodes: any[];
}

export interface GoogleAnalyticsData {
    hasGA4: boolean;
    hasUniversalAnalytics: boolean;
    hasGTM: boolean;
    measurementIds: string[];
    gtmContainers: string[];
    uaIds: string[];
}

export interface SearchConsoleData {
    hasMetaTag: boolean;
    metaTagContent?: string;
    hasHtmlFile: boolean;
    hasDnsTxt: boolean;
    dnsTxtContent?: string;
}

export interface AnalyticsData {
    googleAnalytics: GoogleAnalyticsData;
    searchConsole: SearchConsoleData;
}

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

export interface AnalysisSettings {
    concurrency: number;
    timeout: number;
    accessibilityStandard: string;
    bestPractices: boolean;
}
