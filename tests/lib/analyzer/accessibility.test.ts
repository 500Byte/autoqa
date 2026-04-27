import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAxeAnalysis } from '@/lib/analyzer/accessibility';
import { AXE_CORE_SOURCE } from '@/lib/axe-constant';

describe('runAxeAnalysis', () => {
    let mockPage: any;

    beforeEach(() => {
        mockPage = {
            addScriptTag: vi.fn().mockResolvedValue(undefined),
            evaluate: vi.fn()
        };
    });

    it('should inject Axe Core and run analysis', async () => {
        const mockViolations = [
            {
                id: 'color-contrast',
                impact: 'serious',
                description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
                nodes: []
            }
        ];

        mockPage.evaluate.mockResolvedValue({ violations: mockViolations });

        const result = await runAxeAnalysis(mockPage, ['wcag2a']);

        expect(mockPage.addScriptTag).toHaveBeenCalledWith({ content: AXE_CORE_SOURCE });
        expect(mockPage.evaluate).toHaveBeenCalled();
        expect(result).toEqual(mockViolations);
    });

    it('should return empty array if script injection fails', async () => {
        mockPage.addScriptTag.mockRejectedValue(new Error('Injection failed'));

        const result = await runAxeAnalysis(mockPage);

        expect(result).toEqual([]);
    });

    it('should return empty array if evaluation fails', async () => {
        mockPage.evaluate.mockRejectedValue(new Error('Eval failed'));

        const result = await runAxeAnalysis(mockPage);

        expect(result).toEqual([]);
    });

    it('should return empty array if axeResults is null', async () => {
        mockPage.evaluate.mockResolvedValue(null);

        const result = await runAxeAnalysis(mockPage);

        expect(result).toEqual([]);
    });
});
