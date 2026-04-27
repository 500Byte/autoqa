import { describe, it, expect } from 'vitest';
import {
    analyzeGoogleAnalytics,
    extractAnalyticsFromScriptContent,
    extractAnalyticsFromHtmlContent,
    comprehensiveAnalyticsScan
} from '@/lib/analyzer/analytics';

describe('analytics analyzer', () => {
    describe('analyzeGoogleAnalytics', () => {
        it('should detect GA4 from script URLs', () => {
            const scripts = ['https://www.googletagmanager.com/gtag/js?id=G-1234567890'];
            const result = analyzeGoogleAnalytics(scripts);
            expect(result.hasGA4).toBe(true);
            expect(result.measurementIds).toContain('G-1234567890');
        });

        it('should detect Universal Analytics from script URLs', () => {
            const scripts = ['https://www.google-analytics.com/analytics.js'];
            const result = analyzeGoogleAnalytics(scripts);
            expect(result.hasUniversalAnalytics).toBe(true);
        });

        it('should detect GTM from script URLs', () => {
            const scripts = ['https://www.googletagmanager.com/gtm.js?id=GTM-ABCDEFG'];
            const result = analyzeGoogleAnalytics(scripts);
            expect(result.hasGTM).toBe(true);
            expect(result.gtmContainers).toContain('GTM-ABCDEFG');
        });
    });

    describe('extractAnalyticsFromScriptContent', () => {
        it('should extract IDs from inline script content', () => {
            const content = `
                gtag('config', 'G-G123456789');
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-K987654');
                ga('create', 'UA-12345678-1', 'auto');
            `;
            const result = extractAnalyticsFromScriptContent(content);
            expect(result.measurementIds).toContain('G-G123456789');
            expect(result.gtmContainers).toContain('GTM-K987654');
            expect(result.uaIds).toContain('UA-12345678-1');
        });
    });

    describe('extractAnalyticsFromHtmlContent', () => {
        it('should extract GTM from noscript iframes', () => {
            const html = `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NOSCRIPT" height="0" width="0"></iframe>`;
            const result = extractAnalyticsFromHtmlContent(html);
            expect(result.gtmContainers).toContain('GTM-NOSCRIPT');
        });

        it('should extract IDs from Complianz attributes', () => {
            const html = `<script data-cmplz-src="https://www.googletagmanager.com/gtag/js?id=G-CMPLZ12345"></script>`;
            const result = extractAnalyticsFromHtmlContent(html);
            expect(result.measurementIds).toContain('G-CMPLZ12345');
        });

        it('should extract IDs from text/plain scripts', () => {
            const html = `<script type="text/plain" class="cmplz-stats">
                gtag('config', 'G-PLAIN99999');
            </script>`;
            const result = extractAnalyticsFromHtmlContent(html);
            expect(result.measurementIds).toContain('G-PLAIN99999');
        });

        it('should extract IDs from general text', () => {
            const html = `<div>Some text with G-TEXT123456 and GTM-TEXT789 and UA-1234-5</div>`;
            const result = extractAnalyticsFromHtmlContent(html);
            expect(result.measurementIds).toContain('G-TEXT123456');
            expect(result.gtmContainers).toContain('GTM-TEXT789');
            expect(result.uaIds).toContain('UA-1234-5');
        });
    });

    describe('comprehensiveAnalyticsScan', () => {
        it('should combine results from all sources', () => {
            const scripts = ['https://www.googletagmanager.com/gtag/js?id=G-SCRIPT12345'];
            const inline = ["gtag('config', 'G-INLINE12345');"];
            const html = "<div>G-HTML1234567890</div>";

            const result = comprehensiveAnalyticsScan(scripts, inline, html);
            expect(result.hasGA4).toBe(true);
            expect(result.measurementIds).toContain('G-SCRIPT12345');
            expect(result.measurementIds).toContain('G-INLINE12345');
            expect(result.measurementIds).toContain('G-HTML1234567890');
        });
    });
});
