import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkLinks } from '@/lib/analyzer/links';

describe('checkLinks', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('should return ok for successful links', async () => {
        (fetch as any).mockResolvedValue({
            status: 200,
            ok: true
        });

        const links = ['https://example.com', 'https://google.com'];
        const results = await checkLinks(links);

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({ link: 'https://example.com', status: 200, ok: true });
        expect(results[1]).toEqual({ link: 'https://google.com', status: 200, ok: true });
    });

    it('should return error for failed links', async () => {
        (fetch as any).mockResolvedValue({
            status: 404,
            ok: false
        });

        const links = ['https://example.com/404'];
        const results = await checkLinks(links);

        expect(results[0]).toEqual({ link: 'https://example.com/404', status: 404, ok: false });
    });

    it('should handle network errors', async () => {
        (fetch as any).mockRejectedValue(new Error('Network error'));

        const links = ['https://example.com'];
        const results = await checkLinks(links);

        expect(results[0]).toEqual({
            link: 'https://example.com',
            status: 0,
            ok: false,
            error: 'Network error'
        });
    });

    it('should handle timeouts', async () => {
        (fetch as any).mockImplementation(() => new Promise((_, reject) => {
            const error = new Error('The user aborted a request.');
            error.name = 'AbortError';
            reject(error);
        }));

        const links = ['https://example.com'];
        const results = await checkLinks(links);

        expect(results[0].error).toBe('Timeout');
        expect(results[0].ok).toBe(false);
    });

    it('should only check unique links and limit to 20', async () => {
        (fetch as any).mockResolvedValue({ status: 200, ok: true });

        const links = Array(30).fill(0).map((_, i) => `https://example.com/${i}`);
        // Add some duplicates
        links.push('https://example.com/0');

        const results = await checkLinks(links);
        expect(results).toHaveLength(20);
        expect(fetch).toHaveBeenCalledTimes(20);
    });
});
