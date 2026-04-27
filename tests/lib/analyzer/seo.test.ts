import { describe, it, expect } from 'vitest';
import { analyzeSeo, PageData } from '@/lib/analyzer/seo';

describe('analyzeSeo', () => {
    it('should return no issues for perfectly optimized page data', () => {
        const pageData: PageData = {
            title: 'Perfect Page Title',
            metaDescription: 'This is a perfect meta description with enough length to be valid and not too long.',
            headings: [
                { tag: 'h1', level: 1, text: 'Main Heading' },
                { tag: 'h2', level: 2, text: 'Subheading' }
            ]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toEqual([]);
    });

    it('should detect missing H1', () => {
        const pageData: PageData = {
            title: 'Title',
            metaDescription: 'Description description description description description',
            headings: [
                { tag: 'h2', level: 2, text: 'Subheading' }
            ]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toContain('No se encontró ninguna etiqueta H1.');
        expect(issues).toContain('El primer encabezado es h2, debería ser h1.');
    });

    it('should detect multiple H1s', () => {
        const pageData: PageData = {
            title: 'Title',
            metaDescription: 'Description description description description description',
            headings: [
                { tag: 'h1', level: 1, text: 'Heading 1' },
                { tag: 'h1', level: 1, text: 'Heading 2' }
            ]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toContain('Se encontraron 2 etiquetas H1.');
    });

    it('should detect skipped heading levels', () => {
        const pageData: PageData = {
            title: 'Title',
            metaDescription: 'Description description description description description',
            headings: [
                { tag: 'h1', level: 1, text: 'H1' },
                { tag: 'h3', level: 3, text: 'H3' }
            ]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toContain('Nivel omitido: 1 -> 3 (en "H3...")');
    });

    it('should detect missing title', () => {
        const pageData: PageData = {
            metaDescription: 'Description description description description description',
            headings: [{ tag: 'h1', level: 1, text: 'H1' }]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toContain('Falta el título de la página.');
    });

    it('should detect missing meta description', () => {
        const pageData: PageData = {
            title: 'Title',
            headings: [{ tag: 'h1', level: 1, text: 'H1' }]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toContain('Falta la meta descripción.');
    });

    it('should detect too short meta description', () => {
        const pageData: PageData = {
            title: 'Title',
            metaDescription: 'Too short',
            headings: [{ tag: 'h1', level: 1, text: 'H1' }]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toContain('La meta descripción es demasiado corta.');
    });

    it('should detect too long meta description', () => {
        const pageData: PageData = {
            title: 'Title',
            metaDescription: 'a'.repeat(161),
            headings: [{ tag: 'h1', level: 1, text: 'H1' }]
        };
        const issues = analyzeSeo(pageData);
        expect(issues).toContain('La meta descripción es demasiado larga.');
    });
});
