import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - Dutch (nl)', () => {
    const parser = new TextParserProvider('nl-NL');

    it('should parse "herinner me over 30 minuten om een pauze te nemen"', () => {
        const result = parser.parse('herinner me over 30 minuten om een pauze te nemen');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('over 30 minuten');
        expect(result.cleanText).toBe('Om een pauze te nemen');
        expect(result.error).toBeNull();
    });

    it('should parse "over 2 uur, bel de koerier"', () => {
        const result = parser.parse('over 2 uur, bel de koerier');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('over 2 uur');
        expect(result.cleanText).toBe('Bel de koerier');
        expect(result.error).toBeNull();
    });

    it('should parse "herinner me volgende maandag om 13:00 uur om te lunchen"', () => {
        const result = parser.parse('herinner me volgende maandag om 13:00 uur om te lunchen');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('volgende maandag om 13:00 uur');
        expect(result.cleanText).toBe('Om te lunchen');
        expect(result.error).toBeNull();
    });
});;