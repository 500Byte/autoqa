import { BrokenLink } from "@/types";

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
