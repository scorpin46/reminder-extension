import * as chrono from "chrono-node";
import * as Recognizers from '@microsoft/recognizers-text-date-time';
import {browser} from "wxt/browser";

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
    'ko': 'ko-KR',  // исправлено: ko-kr → ko-KR

    // Эти коды нужно проверить в документации Microsoft Recognizers
    'tr': 'tr-TR',
    'hi': 'hi-IN',
    'ar': 'ar-AE',
    'sv': 'sv-SE',
    'th': 'th-TH',
    'vi': 'vi-VN',
    'he': 'he-IL',
    'pl': 'pl-PL',
    'cs': 'cs-CZ',
    'hu': 'hu-HU',
    'ro': 'ro-RO',
    'bg': 'bg-BG',
    'el': 'el-GR',
    'uk': 'uk-UA',
    'ca': 'ca-ES',
    'id': 'id-ID',
    'ms': 'ms-MY',
    'da': 'da-DK',
    'fi': 'fi-FI',
    'no': 'nb-NO',
};

// ✅ Улучшенные триггеры с границами слов и безопасными паттернами
const TRIGGER_PATTERNS: Record<string, string> = {
    ru: [
        '(?:на)?помн(?:и(?:ть|шь|т|м|те|ят|ю))\\s*(?:мне)?',
        '(?:на)?помина(?:ние|ния|ю|ешь|ет|ем|ете|ют)',
        '(?:установи|создай|добавь|поставь)\\s+напоминание',
        'не\\s+забудь',
        'нужно\\s+напомнить',
        'хочу\\s+напомнить',
        'напомни\\b',
        'нагадай\\b',
        'запомни\\b',
        'запиши\\b',
        'заметка\\b',
        'про(?:\\s+то)?\\b',
        'о(?:\\s+том,\\s+что)?\\b',
        'что\\b',
    ].join('|'),

    en: [
        'remind\\s+me',
        'reminder',
        'set\\s+reminder',
        'create\\s+reminder',
        'add\\s+reminder',
        'don\'?t\\s+forget',
        'need\\s+to\\s+remember',
        'make\\s+a\\s+note',
        'note\\s+to\\s+self',
        // Вежливые формы
        'please',
        'kindly',
        'if\\s+you\\s+(?:can|could)'
    ].join('|'),

    de: [
        'erinnere\\s+mich',
        'erinnerung',
        '(eine|stelle)\\s+erinnerung',
        'nicht\\s+vergessen',
        'bitte',
    ].join('|'),

    fr: [
        'rappelle\\s+moi',
        'rappel',
        'crée\\s+rappel',
        'cree\\s+rappel',
        'n\'?oublie\\s+pas',
        's\'il\\s+te\\s+plaît',
        's\'il\\s+vous\\s+plaît',
        'stp',
        'svp'
    ].join('|'),

    es: [
        'recuérdame',
        'recordatorio',
        'crea\\s+recordatorio',
        'no\\s+olvides',
        'por\\s+favor',
        'porfa'
    ].join('|'),

    it: [
        'ricordami',
        'promemoria',
        'crea\\s+promemoria',
        'non\\s+dimenticare',
        'per\\s+favore',
        'perfavore'
    ].join('|'),

    pt: [
        'lembrete',
        'lembrar\\s+me',
        'criar\\s+lembrete',
        'não\\s+esqueça',
        'por\\s+favor',
        'pf',
        'pfv'
    ].join('|'),

    nl: [
        'herinner\\s+me',
        'herinnering',
        'maak\\s+herinnering',
        'vergeet\\s+niet',
        'alsjeblieft',
        'alstublieft'
    ].join('|'),

    zh: [
        '提醒我',
        '提醒',
        '设置提醒',
        '别忘记',
        '别忘了',
        '请'
    ].join('|'),

    ja: [
        'リマインダー',
        '思い出させて',
        '忘れないで',
        'ください',
        'お願い'
    ].join('|'),

    ko: [
        '알림',
        '상기시켜\\s+줘',
        '설정',
        '잊지\\s+마',
        '주세요'
    ].join('|'),

    tr: [
        'hatırlat',
        'hatırlatıcı',
        'ayarla',
        'unutma',
        'lütfen'
    ].join('|'),

    pl: [
        'przypomnij',
        'przypomnienie',
        'ustaw\\s+przypomnienie',
        'nie\\s+zapomnij',
        'proszę'
    ].join('|'),

    hi: [
        'याद\\s+दिलाओ',
        'रिमाइंडर',
        'सेट\\s+करें',
        'भूलना\\s+नहीं',
        'कृपया',
        'प्लीज़'
    ].join('|')
};

// ✅ Предлоги и артикли для удаления (только в начале/конце)
const REMOVABLE_WORDS:Record<string, string> = {
    ru: 'в|во|на|с|со|к|у|за|по|из|от|до|для|без|через|о|об|про|а|и|но|или|же|ли|ведь',
    en: 'a|an|the|in|on|at|for|to|with|by|from|of|off|out|over|under|and|or|but',
    de: 'der|die|das|den|dem|des|ein|eine|einer|eines|einem|in|auf|bei|mit|nach|von|zu|aus|durch|für|ohne|und|oder|aber',
    fr: 'le|la|les|un|une|des|du|de|à|au|aux|en|dans|sur|sous|avec|sans|pour|par|et|ou|mais',
    es: 'el|la|los|las|un|una|unos|unas|de|del|a|al|en|sobre|bajo|con|sin|por|para|y|o|pero',
    it: 'il|lo|la|i|gli|le|un|uno|una|un\'|di|a|da|in|con|su|per|tra|fra|e|o|ma',
    pt: 'o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|por|para|com|sem|sobre|e|ou|mas',
    nl: 'de|het|een|in|op|aan|bij|met|van|uit|naar|voor|door|over|onder|en|of|maar',
    zh: '的|了|在|和|就|个|也|很',
    ja: 'の|は|が|を|に|で|と|から|まで|より|も|や|か|ね|よ',
    ko: '의|는|가|을|를|에|에서|으로|로|와|과|랑|하고|도|만|부터|까지'
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
                error: browser.i18n.getMessage('errorNoSpeechText'), 
            };
        }

        let result = this.#tryChronoParse(text) ?? this.#tryMicrosoftParse(text);

        // ✅ Оставляем правильную фильтрацию прошлых дат
        if (result?.date && result.date.getTime() < Date.now()) {
            result = null;
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
            const localeChrono: typeof chrono = chrono[this.shortLocale as keyof typeof chrono] as unknown as typeof chrono;

            const results = localeChrono.parse(text, new Date, {forwardDate: true});

            if (results?.length > 0) {
                console.log(results);
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
            console.log(msCulture, msResults);

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
        const now = new Date();
        let bestDate: Date | null = null;
        let bestDiff = Infinity;

        const checkDate = (dateStr: string) => {
            if (!dateStr) return;
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return;

            const diff = date.getTime() - now.getTime();
            if (diff >= 0 && diff < bestDiff) {
                bestDiff = diff;
                bestDate = date;
            }
        };

        // Обработка вложенного resolution (неоднозначные даты)
        if (value.resolution && Array.isArray(value.resolution)) {
            for (const item of value.resolution) {
                checkDate(item.value);
                checkDate(item.start);
            }
        }

        // Для простых случаев (однозначные даты)
        checkDate(value.value);
        checkDate(value.start);

        return bestDate;
    }

    // ✅ Полностью переработанный метод очистки текста
    #cleanText(fullText: string, dateText: string, locale: string): string {
        let cleaned = fullText;

        // Удаляем распознанную дату
        if (dateText) {
            const escapedDate = dateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const dateRegex = new RegExp(`\\s*${escapedDate}\\s*`, 'gi');
            cleaned = cleaned.replace(dateRegex, ' ');
        }
        
        // Удаляем триггеры (команды) циклически
        const triggerPattern = TRIGGER_PATTERNS[locale];
        if (triggerPattern) {
            let prevLength;
            do {
                prevLength = cleaned.length;
                // Удаляем триггеры в начале строки
                const startTriggerRegex = new RegExp(`^\\s*(${triggerPattern})\\s+`, 'gi');
                cleaned = cleaned.replace(startTriggerRegex, '');
                // // Удаляем триггеры в конце (Такого быть не может)
                // const endTriggerRegex = new RegExp(`\\s+(${triggerPattern})\\s*$`, 'gi');
                // cleaned = cleaned.replace(endTriggerRegex, '');
            } while (cleaned.length !== prevLength);
        }

        // Удаляем предлоги и артикли, короткие слова
        const removableWords = REMOVABLE_WORDS[locale];
        if (removableWords) {
            let prevLength;
            do {
                prevLength = cleaned.length;
                // Удаляем в начале строки
                cleaned = cleaned.replace(new RegExp(`^(?:${removableWords})\\s+`, 'i'), '');
                // Удаляем в конце строки
                cleaned = cleaned.replace(new RegExp(`\\s+(?:${removableWords})$`, 'i'), '');
            } while (cleaned.length !== prevLength);
        }

        // 5. Финальная очистка
        cleaned = cleaned
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned || fullText;
    }
}