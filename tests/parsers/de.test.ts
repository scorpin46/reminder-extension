import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - German (de)', () => {
    const parser = new TextParserProvider('de-DE');

    it('should parse "Erinnere mich in 30 Minuten an eine Pause"', () => {
        const result = parser.parse('Erinnere mich in 30 Minuten an eine Pause');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('in 30 Minuten');
        expect(result.cleanText).toBe('An eine Pause');
        expect(result.error).toBeNull();
    });

    it('should parse "In 2 Stunden den Kurier anrufen"', () => {
        const result = parser.parse('In 2 Stunden den Kurier anrufen');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('In 2 Stunden');
        expect(result.cleanText).toBe('Den Kurier anrufen');
        expect(result.error).toBeNull();
    });

    it('should parse "Erinnere mich nächsten Montag um 13:00 Uhr zum Mittagessen"', () => {
        const result = parser.parse('Erinnere mich nächsten Montag um 13:00 Uhr zum Mittagessen');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('nächsten Montag um 13:00 Uhr');
        expect(result.cleanText).toBe('Zum Mittagessen');
        expect(result.error).toBeNull();
    });
});;;