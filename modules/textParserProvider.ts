import * as chrono from "chrono-node";
import {ReminderRepository} from "@/modules/repositories/reminderRepository";

export type TextParsedData = {
    sourceText: string;
    cleanText: string;
    date: Date | null;
    error: string | null;
}

export class TextParserProvider
{
    constructor(private readonly locale: string) {
        this.locale = locale;
    }
    
    parse(text: string): TextParsedData {
        try {
            // @ts-ignore
            const localeChrono = chrono[this.locale.split('-')[0]];
            const results = localeChrono?.parse(text) || [];
            const bestResult = results[0];
            const reminderDateValue = bestResult?.start.date();

            console.log('parseRecordingText', text, results, bestResult);

            return {
                sourceText: text,
                cleanText: this.cleanText(text ?? '', bestResult?.text || ''),
                date: reminderDateValue && !isNaN(reminderDateValue) ? reminderDateValue : null,
                error: null
            };
        } catch (e) {
            console.error('parseRecordingText error:', e);

            return {
                sourceText: text,
                cleanText: '',
                date: null,
                error: 'Ошибка парсинга даты',
            };
        }
    }

    cleanText(fullText: string, dateText: string) {
        return fullText
            .replace(dateText, '')
            .replace(/\s+/g, ' ')
            .replace(/[,\s]+$/g, '')
            .replace(/^(remind me|reminder|напомн[^!\s]+|напомина[^!\s]+)/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}