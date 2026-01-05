import { BrokenLink } from "@/types";

export async function checkLinks(links: string[]): Promise<BrokenLink[]> {
    // Check only unique links
    const uniqueLinks = [...new Set(links)];

    // Limit to first 20 for performance (matching original logic)
    const linksToCheck = uniqueLinks.slice(0, 20);

    const results = await Promise.all(linksToCheck.map(async (link) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per link

            const res = await fetch(link, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return { link, status: res.status, ok: res.ok };
        } catch (e: any) {
            return {
                link,
                status: 0,
                ok: false,
                error: e.name === 'AbortError' ? 'Timeout' : (e.message || 'Failed')
            };
        }
    }));

    return results;
}
