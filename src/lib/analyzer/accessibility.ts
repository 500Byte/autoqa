import { Page } from 'playwright-core';
import { AXE_CORE_SOURCE } from '@/lib/axe-constant';
import { AxeViolation } from "@/types";

export async function runAxeAnalysis(page: Page): Promise<AxeViolation[]> {
    try {
        // Inject Axe Core with error handling
        try {
            await page.addScriptTag({ content: AXE_CORE_SOURCE });
        } catch (injectError) {
            console.error('Failed to inject Axe Core:', injectError);
            return [];
        }

        // Run Analysis with safely
        const axeResults = await page.evaluate(async () => {
            // @ts-ignore
            if (typeof window.axe === 'undefined') return { violations: [] };

            try {
                // @ts-ignore
                return await window.axe.run(document, {
                    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
                    resultTypes: ['violations']
                });
            } catch (runError) {
                return { violations: [] };
            }
        }) as any;

        if (!axeResults || !axeResults.violations) return [];

        return axeResults.violations.map((v: any) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes
        }));

    } catch (error) {
        console.error('Axe analysis failed:', error);
        return [];
    }
}
