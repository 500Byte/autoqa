import { Page } from 'playwright-core';
import { AXE_CORE_SOURCE } from '@/lib/axe-constant';
import { AxeViolation } from "@/types";

/**
 * Runs accessibility analysis on a page using Axe Core.
 *
 * @param page - Playwright Page object.
 * @param tags - List of WCAG tags or best practice tags to check.
 * @returns Array of accessibility violations found.
 */
export async function runAxeAnalysis(page: Page, tags: string[] = ['wcag2a', 'wcag2aa', 'best-practice']): Promise<AxeViolation[]> {
    try {
        // Inyectar Axe Core
        try {
            await page.addScriptTag({ content: AXE_CORE_SOURCE });
        } catch (injectError) {
            console.error('Failed to inject Axe Core:', injectError);
            return [];
        }

        // Ejecutar análisis de forma segura
        const axeResults = await page.evaluate(async (tags) => {
            // @ts-expect-error window.axe is injected at runtime
            if (typeof window.axe === 'undefined') return { violations: [] };

            try {
                // @ts-expect-error window.axe is injected at runtime
                return await window.axe.run(document, {
                    runOnly: { type: 'tag', values: tags },
                    resultTypes: ['violations']
                });
            } catch {
                return { violations: [] };
            }
        }, tags) as { violations: AxeViolation[] };

        if (!axeResults || !axeResults.violations) return [];

        return axeResults.violations.map((v: AxeViolation) => ({
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
