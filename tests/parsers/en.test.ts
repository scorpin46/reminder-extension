import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - English (en)', () => {
    const parser = new TextParserProvider('en-US');

    it('should parse "take a break in 30 minutes"', () => {
        const result = parser.parse('take a break in 30 minutes');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('in 30 minutes');
        expect(result.cleanText).toBe('Take a break');
        expect(result.error).toBeNull();
    });

    it('should parse "in 2 hours, call a courier"', () => {
        const result = parser.parse('in 2 hours, call a courier');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('in 2 hours');
        expect(result.cleanText).toBe('Call a courier');
        expect(result.error).toBeNull();
    });

    it('should parse "remind me next Monday at 1:00 PM to go get lunch"', () => {
        const result = parser.parse('remind me next Monday at 1:00 PM to go get lunch');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toContain('next Monday at 1:00 PM');
        expect(result.cleanText).toBe('To go get lunch');
        expect(result.error).toBeNull();
    });
});