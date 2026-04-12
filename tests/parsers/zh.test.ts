import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - Chinese (zh)', () => {
    const parser = new TextParserProvider('zh-CN');

    it('should parse "提醒我30分钟后休息一下"', () => {
        const result = parser.parse('提醒我30分钟后休息一下');

        expect(result.date).toBeInstanceOf(Date);
        // chrono для китайского может упасть в fallback на Microsoft
        expect(['chrono', 'microsoft']).toContain(result.parserSource);
        expect(result.cleanText).toBe('休息一下');
        expect(result.error).toBeNull();
    });

    it('should parse "2小时后给快递员打电话"', () => {
        const result = parser.parse('2小时后给快递员打电话');

        expect(result.date).toBeInstanceOf(Date);
        expect(['chrono', 'microsoft']).toContain(result.parserSource);
        expect(result.cleanText).toBe('给快递员打电话');
        expect(result.error).toBeNull();
    });

    it('should parse "提醒我下周一中午1点去吃午饭"', () => {
        const result = parser.parse('提醒我下周一中午1点去吃午饭');

        expect(result.date).toBeInstanceOf(Date);
        expect(['chrono', 'microsoft']).toContain(result.parserSource);
        expect(result.cleanText).toBe('去吃午饭');
        expect(result.error).toBeNull();
    });
});