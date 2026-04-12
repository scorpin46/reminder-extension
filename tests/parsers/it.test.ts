import { describe, it, expect } from 'vitest';
import { TextParserProvider } from "@/modules/textParserProvider";

describe('TextParserProvider - Italian (it)', () => {
    const parser = new TextParserProvider('it-IT');

    // Временные интервалы (относительное время) - самые надёжные
    it('should parse "Ricordami di chiamare il medico tra 10 minuti"', () => {
        const result = parser.parse('Ricordami di chiamare il medico tra 10 minuti');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('10 minuti');
        expect(result.cleanText).toBe('Di chiamare il medico');
        expect(result.error).toBeNull();
    });

    it('should parse "Riunione tra 2 ore"', () => {
        const result = parser.parse('Riunione tra 2 ore');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('2 ore');
        expect(result.cleanText).toBe('Riunione');
        expect(result.error).toBeNull();
    });

    // Абсолютное время (сегодня)
    it('should parse "Riunione alle 14:30"', () => {
        const result = parser.parse('Riunione alle 14:30');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('14:30');
        expect(result.cleanText).toBe('Riunione');
        expect(result.error).toBeNull();
    });

    // Дни недели
    it('should parse "Ricordami di portare il cane dal veterinario lunedì alle 9:00"', () => {
        const result = parser.parse('Ricordami di portare il cane dal veterinario lunedì alle 9:00');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('lunedì');
        expect(result.cleanText).toBe('Di portare il cane dal veterinario');
        expect(result.error).toBeNull();
    });
});