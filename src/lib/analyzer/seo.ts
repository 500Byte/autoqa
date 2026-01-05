import { Heading } from "@/types";

export interface PageData {
    headings: Heading[];
    title?: string;
    metaDescription?: string | null;
}

export function analyzeSeo(pageData: PageData): string[] {
    const seoIssues: string[] = [];
    const { headings, title, metaDescription } = pageData;

    // H1 Checks
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count > 1) seoIssues.push(`Found ${h1Count} H1 tags.`);
    if (h1Count === 0) seoIssues.push('No H1 tag found.');

    // Heading Hierarchy
    let previousLevel = 0;
    headings.forEach((h, index) => {
        if (index === 0) {
            if (h.level !== 1) seoIssues.push(`First heading is ${h.tag}, should be h1.`);
        } else {
            if (h.level > previousLevel + 1) {
                seoIssues.push(`Skipped level: ${previousLevel} -> ${h.level} (at "${h.text.substring(0, 30)}...")`);
            }
        }
        previousLevel = h.level;
    });

    // Title Check
    if (!title) seoIssues.push('Page title is missing.');

    // Meta Description Check
    if (!metaDescription) {
        seoIssues.push('Meta description is missing.');
    } else if (metaDescription.length < 50) {
        seoIssues.push('Meta description is too short.');
    } else if (metaDescription.length > 160) {
        seoIssues.push('Meta description is too long.');
    }

    return seoIssues;
}
