import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeSearchConsole } from '@/lib/analyzer/searchconsole';
import { getDnsRecords } from '@layered/dns-records';

vi.mock('@layered/dns-records', () => ({
    getDnsRecords: vi.fn()
}));

describe('analyzeSearchConsole', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should detect meta tag verification', async () => {
        (getDnsRecords as any).mockResolvedValue([]);
        const result = await analyzeSearchConsole('https://example.com', 'google-site-verification-123');

        expect(result.hasMetaTag).toBe(true);
        expect(result.metaTagContent).toBe('google-site-verification-123');
    });

    it('should detect DNS TXT verification', async () => {
        (getDnsRecords as any).mockResolvedValue([
            'v=spf1 include:_spf.google.com ~all',
            'google-site-verification=dns-verification-code'
        ]);

        const result = await analyzeSearchConsole('https://example.com');

        expect(result.hasDnsTxt).toBe(true);
        expect(result.dnsTxtContent).toBe('google-site-verification=dns-verification-code');
    });

    it('should handle complex DNS records (objects)', async () => {
        (getDnsRecords as any).mockResolvedValue([
            { data: 'google-site-verification=complex-code' }
        ]);

        const result = await analyzeSearchConsole('https://example.com');

        expect(result.hasDnsTxt).toBe(true);
        expect(result.dnsTxtContent).toBe('google-site-verification=complex-code');
    });

    it('should use DNS cache if provided', async () => {
        const cache = new Map<string, Promise<unknown[]>>();
        const mockRecords = ['google-site-verification=cached-code'];
        cache.set('example.com', Promise.resolve(mockRecords));

        const result = await analyzeSearchConsole('https://example.com', undefined, cache);

        expect(result.hasDnsTxt).toBe(true);
        expect(result.dnsTxtContent).toBe('google-site-verification=cached-code');
        expect(getDnsRecords).not.toHaveBeenCalled();
    });

    it('should handle DNS lookup failure', async () => {
        (getDnsRecords as any).mockRejectedValue(new Error('DNS failure'));

        const result = await analyzeSearchConsole('https://example.com');

        expect(result.hasDnsTxt).toBe(false);
        // Should not throw
    });

    it('should strip www from domain for DNS lookup', async () => {
        (getDnsRecords as any).mockResolvedValue([]);
        await analyzeSearchConsole('https://www.example.com');
        expect(getDnsRecords).toHaveBeenCalledWith('example.com', 'TXT');
    });
});
