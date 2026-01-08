import { SearchConsoleData } from "@/types";
import { getDnsRecords } from "@layered/dns-records";

/**
 * Analyze Search Console verification methods
 * @param url - The URL being analyzed
 * @param metaTagContent - Content of google-site-verification meta tag (if found)
 * @param dnsCache - Optional cache for DNS lookups to avoid redundant requests
 */
export async function analyzeSearchConsole(
    url: string,
    metaTagContent?: string,
    dnsCache?: Map<string, Promise<any[]>>
): Promise<SearchConsoleData> {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Strip www. if present for DNS lookup (verification is usually on root domain)
    const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

    let hasMetaTag = false;
    let hasHtmlFile = false;
    let hasDnsTxt = false;
    let dnsTxtContent: string | undefined;

    // 1. Check Meta Tag
    if (metaTagContent) {
        hasMetaTag = true;
    }

    // 2. Check HTML File verification
    // Common patterns: google<verification-code>.html
    try {
        const baseUrl = `${new URL(url).protocol}//${new URL(url).hostname}`;
        // We would need to know the specific filename, which varies
        // For now, we'll mark this as a limitation
        // In practice, we could check if metaTagContent exists and try common patterns
        hasHtmlFile = false; // This would require the actual filename
    } catch (e) {
        // Ignore errors
    }

    // 3. Check DNS TXT Record
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

        // Look for google-site-verification in TXT records
        // DnsRecord objects have a 'data' property containing the actual value
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
        // DNS lookup failed, but this is not critical
    }

    return {
        hasMetaTag,
        metaTagContent,
        hasHtmlFile,
        hasDnsTxt,
        dnsTxtContent
    };
}
