import { Heading } from "@/types";

export interface PageData {
    headings: Heading[];
    title?: string;
    metaDescription?: string | null;
}

export function analyzeSeo(pageData: PageData): string[] {
    const seoIssues: string[] = [];
    const { headings, title, metaDescription } = pageData;

    // H1 Checks
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count > 1) seoIssues.push(`Se encontraron ${h1Count} etiquetas H1.`);
    if (h1Count === 0) seoIssues.push('No se encontró ninguna etiqueta H1.');

    // Heading Hierarchy
    let previousLevel = 0;
    headings.forEach((h, index) => {
        if (index === 0) {
            if (h.level !== 1) seoIssues.push(`El primer encabezado es ${h.tag}, debería ser h1.`);
        } else {
            if (h.level > previousLevel + 1) {
                seoIssues.push(`Nivel omitido: ${previousLevel} -> ${h.level} (en "${h.text.substring(0, 30)}...")`);
            }
        }
        previousLevel = h.level;
    });

    // Title Check
    if (!title) seoIssues.push('Falta el título de la página.');

    // Meta Description Check
    if (!metaDescription) {
        seoIssues.push('Falta la meta descripción.');
    } else if (metaDescription.length < 50) {
        seoIssues.push('La meta descripción es demasiado corta.');
    } else if (metaDescription.length > 160) {
        seoIssues.push('La meta descripción es demasiado larga.');
    }

    return seoIssues;
}
