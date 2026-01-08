import { SearchConsoleData } from "@/types";
import { getDnsRecords } from "@layered/dns-records";

/**
 * Analizar métodos de verificación de Search Console
 */
export async function analyzeSearchConsole(
    url: string,
    metaTagContent?: string,
    dnsCache?: Map<string, Promise<any[]>>
): Promise<SearchConsoleData> {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Eliminar www. si está presente para la búsqueda DNS
    const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

    let hasMetaTag = false;
    let hasHtmlFile = false;
    let hasDnsTxt = false;
    let dnsTxtContent: string | undefined;

    // 1. Verificar Meta Tag
    if (metaTagContent) {
        hasMetaTag = true;
    }

    // 2. Verificar archivo HTML (limitación actual)
    try {
        const baseUrl = `${new URL(url).protocol}//${new URL(url).hostname}`;
        hasHtmlFile = false;
    } catch (e) {
        // Ignore errors
    }

    // 3. Verificar TXT en DNS
    try {
        let txtRecords;

        if (dnsCache) {
            if (!dnsCache.has(domain)) {
                console.log(`[SearchConsole] Looking up TXT records for domain: ${domain} (first time)`);
                const promise = getDnsRecords(domain, 'TXT');
                dnsCache.set(domain, promise);
            } else {
                console.log(`[SearchConsole] Using cached TXT records for domain: ${domain}`);
            }
            txtRecords = await dnsCache.get(domain);
        } else {
            console.log(`[SearchConsole] Looking up TXT records for domain: ${domain} (no cache)`);
            txtRecords = await getDnsRecords(domain, 'TXT');
        }
        console.log(`[SearchConsole] TXT records found:`, JSON.stringify(txtRecords, null, 2));

        // Buscar google-site-verification en los registros TXT
        if (txtRecords && txtRecords.length > 0) {
            const googleVerification = txtRecords.find((record) => {
                const recordValue = typeof record === 'string' ? record : (record as any).data;
                const match = recordValue && recordValue.toLowerCase().includes('google-site-verification');
                if (match) console.log(`[SearchConsole] Found matching record: ${recordValue}`);
                return match;
            });

            if (googleVerification) {
                hasDnsTxt = true;
                dnsTxtContent = typeof googleVerification === 'string' ? googleVerification : (googleVerification as any).data;
            }
        } else {
            console.log(`[SearchConsole] No TXT records found or empty array.`);
        }
    } catch (error) {
        console.error(`[SearchConsole] DNS lookup failed for ${domain}:`, error);
    }

    return {
        hasMetaTag,
        metaTagContent,
        hasHtmlFile,
        hasDnsTxt,
        dnsTxtContent
    };
}
