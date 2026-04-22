import { BrokenLink } from "@/types";

/**
 * Checks a list of URLs for broken links.
 *
 * @param links - Array of URLs to check.
 * @returns Array of BrokenLink objects with status and error information.
 */
export async function checkLinks(links: string[]): Promise<BrokenLink[]> {
    // Verificar solo enlaces únicos
    const uniqueLinks = [...new Set(links)];

    // Limitar a los primeros 20 para rendimiento
    const linksToCheck = uniqueLinks.slice(0, 20);

    const results = await Promise.all(linksToCheck.map(async (link) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(link, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return { link, status: res.status, ok: res.ok };
        } catch (e: unknown) {
            const error = e as Error;
            return {
                link,
                status: 0,
                ok: false,
                error: error.name === 'AbortError' ? 'Timeout' : (error.message || 'Failed')
            };
        }
    }));

    return results;
}
