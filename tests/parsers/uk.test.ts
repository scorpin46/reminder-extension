import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - Ukrainian (uk)', () => {
    const parser = new TextParserProvider('uk-UA');

    it('should parse "Нагадай мені зробити перерву через 30 хвилин"', () => {
        const result = parser.parse('Нагадай мені зробити перерву через 30 хвилин');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('через 30 хвилин');
        expect(result.cleanText).toBe('Зробити перерву');
        expect(result.error).toBeNull();
    });

    it('should parse "Через 2 години подзвонити кур\'єру"', () => {
        const result = parser.parse('Через 2 години подзвонити кур\'єру');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('Через 2 години');
        expect(result.cleanText).toBe('Подзвонити кур\'єру');
        expect(result.error).toBeNull();
    });

    it('should parse "Нагадай мені наступного понеділка о 13:00 піти пообідати"', () => {
        const result = parser.parse('Нагадай мені наступного понеділка о 13:00 піти пообідати');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('наступного понеділка о 13:00');
        expect(result.cleanText).toBe('Піти пообідати');
        expect(result.error).toBeNull();
    });
});