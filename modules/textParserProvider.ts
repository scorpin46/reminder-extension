import * as chrono from "chrono-node";
import * as Recognizers from '@microsoft/recognizers-text-date-time';

export type TextParsedData = {
    sourceText: string;
    cleanText: string;
    date: Date | null;
    error: string | null;
    parserSource?: 'chrono' | 'microsoft';
    dateText?: string;
}


const msLocaleMap: Record<string, string> = {
    'default': Recognizers.Culture.English,

    // Языки с существующими константами
    'fr': Recognizers.Culture.French,
    'de': Recognizers.Culture.German,
    'es': Recognizers.Culture.Spanish,
    'pt': Recognizers.Culture.Portuguese,
    'nl': Recognizers.Culture.Dutch,
    'zh': Recognizers.Culture.Chinese,
    'it': Recognizers.Culture.Italian,
    'ja': Recognizers.Culture.Japanese,
    'ko': 'ko-kr',

    'tr': 'tr-tr',
    'hi': 'hi-in',
    'ar': 'ar-ae',
    'sv': 'sv-se',
    'th': 'th-th',
    'vi': 'vi-vn',
    'he': 'he-il',
    'pl': 'pl-pl',
    'cs': 'cs-cz',
    'hu': 'hu-hu',
    'ro': 'ro-ro',
    'bg': 'bg-bg',
    'el': 'el-gr',
    'uk': 'uk-ua',
    'ca': 'ca-es',
    'id': 'id-id',
    'ms': 'ms-my',
    'da': 'da-dk',
    'fi': 'fi-fi',
    'no': 'nb-no',
};

// Триггеры для удаления командных слов
const TRIGGER_PATTERNS = {
    russian: [
        'напомн(и|ить|ишь|ит|им|ите|ят|ю)',
        'напомина(ние|ния|ю|ешь|ет|ем|ете|ют)',
        'напомни мне',
        '(установи|создай|добавь|поставь) напоминание',
        'не забудь',
        'нужно напомнить',
        'хочу напомнить'
    ].join('|'),

    english: [
        'remind me',
        'reminder',
        'set reminder',
        'create reminder',
        'add reminder',
        'dont forget',
        'need to remember'
    ].join('|'),

    german: [
        'erinnere mich',
        'erinnerung',
        'stelle erinnerung',
        'nicht vergessen'
    ].join('|'),

    french: [
        'rappelle moi',
        'rappel',
        'cree rappel',
        'noublie pas'
    ].join('|'),

    spanish: [
        'recuerdame',
        'recordatorio',
        'crea recordatorio',
        'no olvides'
    ].join('|'),

    italian: [
        'ricordami',
        'promemoria',
        'crea promemoria',
        'non dimenticare'
    ].join('|'),

    portuguese: [
        'lembrete',
        'lembrar me',
        'criar lembrete',
        'nao esqueca'
    ].join('|'),

    dutch: [
        'herinner me',
        'herinnering',
        'maak herinnering',
        'vergeet niet'
    ].join('|'),

    chinese: [
        '提醒我',
        '提醒',
        '设置提醒',
        '别忘记'
    ].join('|'),

    japanese: [
        'リマインダー',
        '思い出させて',
        '設定',
        '忘れないで'
    ].join('|'),

    korean: [
        '알림',
        '상기시켜 줘',
        '설정',
        '잊지 마'
    ].join('|'),

    turkish: [
        'hatırlat',
        'hatırlatıcı',
        'ayarla',
        'unutma'
    ].join('|'),

    polish: [
        'przypomnij',
        'przypomnienie',
        'ustaw przypomnienie',
        'nie zapomnij'
    ].join('|'),

    hindi: [
        'याद दिलाओ',
        'रिमाइंडर',
        'सेट करें',
        'भूलना नहीं'
    ].join('|')
};

export class TextParserProvider {
    readonly #locale: string
    
    constructor(locale: string) {
        this.#locale = locale;
    }

    get shortLocale() {
        return this.#locale.split('-')[0].toLowerCase();
    }

    parse(text: string): TextParsedData {
        if (!text || text.trim() === '') {
            return {
                sourceText: text,
                cleanText: '',
                date: null,
                error: 'Empty text provided',
            };
        }

        let result = this.#tryChronoParse(text) ?? this.#tryMicrosoftParse(text);

        if (result?.date && result.date.getTime() < Date.now()) {
            result = null; //защита от прошлых дат и "вчера" и прочих слов
        }
        
        return result ?? {
            sourceText: text,
            cleanText: this.#cleanText(text, '', this.shortLocale),
            date: null,
            error: null,
        };
    }

    #tryChronoParse(text: string): TextParsedData | null {
        try {
            const localeChrono = chrono[this.shortLocale as keyof typeof chrono];

            // @ts-ignore
            const results = localeChrono.parse(text);

            if (results?.length > 0) {
                const result = results[0];
                const date = result?.start?.date();

                if (date && !isNaN(date.getTime())) {
                    return {
                        sourceText: text,
                        cleanText: this.#cleanText(text, result.text || '', this.shortLocale),
                        date: date,
                        error: null,
                        parserSource: 'chrono',
                        dateText: result.text
                    };
                }
            }
            return null;
        } catch (e) {
            console.warn('Chrono failed:', e);
            return null;
        }
    }

    #tryMicrosoftParse(text: string): TextParsedData | null {
        try {
            const msCulture = msLocaleMap[this.shortLocale];

            const msResults = Recognizers.recognizeDateTime(text, msCulture);

            if (msResults?.length > 0) {
                for (const msResult of msResults) {
                    if (!this.#isDateTimeType(msResult.typeName)) continue;

                    if (msResult.resolution?.values) {
                        for (const value of msResult.resolution.values) {
                            const date = this.#extractDateFromMsValue(value);
                            if (date) {
                                return {
                                    sourceText: text,
                                    cleanText: this.#cleanText(text, msResult.text || '', this.shortLocale),
                                    date: date,
                                    error: null,
                                    parserSource: 'microsoft',
                                    dateText: msResult.text
                                };
                            }
                        }
                    }
                }
            }
            return null;
        } catch (e) {
            console.warn('Microsoft failed:', e);
            return null;
        }
    }

    #isDateTimeType(typeName: string): boolean {
        return typeName?.includes('datetime') || typeName?.includes('date') || typeName?.includes('time');
    }

    #extractDateFromMsValue(value: any): Date | null {
        const dateStr = value?.value || value?.start;
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) ? date : null;
    }

    #cleanText(fullText: string, dateText: string, locale: string): string {
        let cleaned = fullText;

        // Удаляем распознанную дату
        if (dateText) {
            const escapedDate = dateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const dateRegex = new RegExp(`\\s*${escapedDate}\\s*`, 'gi');
            cleaned = cleaned.replace(dateRegex, ' ');
        }

        // Удаляем триггеры на основе языка
        const triggerPattern = this.#getTriggerPattern(locale);
        if (triggerPattern) {
            const triggerRegex = new RegExp(`^(${triggerPattern})\\s+`, 'gi');
            cleaned = cleaned.replace(triggerRegex, '');
        }

        // Финальная очистка
        cleaned = cleaned
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned || fullText;
    }

    #getTriggerPattern(locale: string): string | null {
        const map: Record<string, keyof typeof TRIGGER_PATTERNS> = {
            'ru': 'russian',
            'en': 'english',
            'de': 'german',
            'fr': 'french',
            'es': 'spanish',
            'it': 'italian',
            'pt': 'portuguese',
            'nl': 'dutch',
            'zh': 'chinese',
            'ja': 'japanese',
            'ko': 'korean',
            'tr': 'turkish',
            'pl': 'polish',
            'hi': 'hindi'
        };

        const key = map[locale];
        return key ? TRIGGER_PATTERNS[key] : null;
    }
}