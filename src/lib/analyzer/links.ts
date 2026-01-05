import { BrokenLink } from "@/types";

export async function checkLinks(links: string[]): Promise<BrokenLink[]> {
    // Check only unique links
    const uniqueLinks = [...new Set(links)];

    // Limit to first 20 for performance (matching original logic)
    const linksToCheck = uniqueLinks.slice(0, 20);

    const results = await Promise.all(linksToCheck.map(async (link) => {
        try {
            const res = await fetch(link, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
            return { link, status: res.status, ok: res.ok };
        } catch (e) {
            return { link, status: 0, ok: false, error: 'Failed' };
        }
    }));

    // Return all results (not just broken ones, so we can calculate stats) but the interface currently only tracks broken ones in the result object usually?
    // Original code:
    // const brokenLinks = linkResults.filter(l => !l.ok);
    // It returns { brokenLinks, totalLinksChecked... }

    // Let's force return of all results so the caller can filter
    return results;
}
