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
    nodes?: any[];
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
}
