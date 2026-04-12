import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - Japanese (ja)', () => {
    const parser = new TextParserProvider('ja-JP');

    it('should parse "次の月曜日の午後1時に昼ごはんを食べる"', () => {
        const result = parser.parse('次の月曜日の午後1時に昼ごはんを食べる');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toBe('次の月曜日の午後1時');
        expect(result.cleanText).toBe('昼ごはんを食べる');
        expect(result.error).toBeNull();
    });

    it('should parse "明日の午前9時に会議を始める"', () => {
        const result = parser.parse('明日の午前9時に会議を始める');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toBe('明日の午前9時');
        expect(result.cleanText).toBe('会議を始める');
        expect(result.error).toBeNull();
    });

    it('should parse "今日の午後3時に買い物に行く"', () => {
        const result = parser.parse('今日の午後3時に買い物に行く');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.dateText).toBe('今日の午後3時');
        expect(result.cleanText).toBe('買い物に行く');
        expect(result.error).toBeNull();
    });
});