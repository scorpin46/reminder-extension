import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - French (fr)', () => {
    const parser = new TextParserProvider('fr-FR');

    it('should parse "rappelle-moi dans 30 minutes de faire une pause"', () => {
        const result = parser.parse('rappelle-moi dans 30 minutes de faire une pause');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('dans 30 minutes');
        expect(result.cleanText).toBe('De faire une pause');
        expect(result.error).toBeNull();
    });

    it('should parse "dans 2 heures, appelle le coursier"', () => {
        const result = parser.parse('dans 2 heures, appelle le coursier');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('dans 2 heures');
        expect(result.cleanText).toBe('Appelle le coursier');
        expect(result.error).toBeNull();
    });

    it('should parse "rappelle-moi lundi prochain à 13h00 pour aller déjeuner"', () => {
        const result = parser.parse('rappelle-moi lundi prochain à 13h00 pour aller déjeuner');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('lundi prochain à 13h00');
        expect(result.cleanText).toBe('Pour aller déjeuner');
        expect(result.error).toBeNull();
    });
});;