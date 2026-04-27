/**
 * Normalizes a URL by adding https:// if no protocol is present and removing trailing slashes.
 *
 * @param url - The URL to normalize.
 * @returns The normalized URL.
 */
export function normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
    }
    try {
        const urlObj = new URL(normalized);
        let result = urlObj.origin + urlObj.pathname;
        if (result.endsWith('/') && urlObj.pathname !== '/') {
            result = result.slice(0, -1);
        }
        return result;
    } catch {
        return normalized;
    }
}

/**
 * Ensures a URL has a protocol and is valid.
 *
 * @param url - The URL to validate.
 * @returns Validated URL or null if invalid.
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url.startsWith('http') ? url : 'https://' + url);
        return true;
    } catch {
        return false;
    }
}
