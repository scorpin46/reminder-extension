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
};

// ✅ Улучшенные триггеры с границами слов и безопасными паттернами
const TRIGGER_PATTERNS: Record<string, string[]> = {
    ru: [
        '(?:про|о) том? что',
        '(?:на|за)?помн(?:и|ить|ишь|ит|им|ите|ят|ю)(?: мне)?',
        '(?:на)?помина(?:ние|ния|ю|ешь|ет|ем|ете|ют)',
        '(?:установи|создай|добавь|поставь) напоминание',
        'не забудь',
        'нужно напомнить',
        'хочу напомнить',
        'что',
    ],

    en: [
        'remind me',
        'reminder',
        '(?:set|create|add|make)(?: a)? reminder',
        'don\'?t forget',
        'need to remember',
        // 'make(?: a)? note', //не удачный пример, т.к. человек может диктовать напоминание "сделать заметку в журнале"
        'note to self',
        // Вежливые формы
        'please',
        'kindly',
        'if you (?:can|could)',
        'that'
    ],

    de: [
        'erinnere mich',
        'erinnerung',
        '(eine|stelle) erinnerung',
        'nicht vergessen',
        'bitte',
    ],

    fr: [
        'rappelle-?moi',
        'rappel',
        '(?:crée|cree) rappel',
        'n\'?oublie pas',
        's\'il te plaît',
        's\'il vous plaît',
        'stp',
        'svp'
    ],

    es: [
        'recuérdame',
        'recordatorio',
        'crea recordatorio',
        'no olvides',
        'por favor',
        'porfa'
    ],

    it: [
        'ricordami',
        'promemoria',
        'crea promemoria',
        'non dimenticare',
        'per favore',
        'perfavore'
    ],

    //плохо парсится
    // pt: [
    //     'lembrete',
    //     'lembrar me',
    //     'criar lembrete',
    //     'não esqueça',
    //     'por favor',
    //     'pf',
    //     'pfv'
    // ],

    nl: [
        'herinner me',
        'herinnering',
        'maak herinnering',
        'vergeet niet',
        'alsjeblieft',
        'alstublieft',
        `\'s`,
        'ochtends|middags|avonds|nachts'
    ],

    zh: [
        '提醒我',
        '提醒',
        '设置提醒',
        '别忘记',
        '别忘了',
        '请'
    ],

    ja: [
        'リマインダー',
        '思い出させて',
        '忘れないで',
        'ください',
        'お願い'
    ],

    // ko: [
    //     '알림',
    //     '상기시켜 줘',
    //     '설정',
    //     '잊지 마',
    //     '주세요'
    // ],

    // tr: [
    //     'hatırlat',
    //     'hatırlatıcı',
    //     'ayarla',
    //     'unutma',
    //     'lütfen'
    // ],

    // pl: [
    //     'przypomnij',
    //     'przypomnienie',
    //     'ustaw przypomnienie',
    //     'nie zapomnij',
    //     'proszę'
    // ],

    // hi: [
    //     'याद दिलाओ',
    //     'रिमाइंडर',
    //     'सेट करें',
    //     'भूलना नहीं',
    //     'कृपया',
    //     'प्लीज़'
    // ],
    
    uk: [
        'нагадай мені',
        'нагадування',
        'створи нагадування',
        'не забудь',
        'треба нагадати',
        'хочу нагадати',
        'будь ласка',
        'що'
    ]
};

export const allowedDateParserLocales = Object.keys(TRIGGER_PATTERNS);

export class TextParserProvider {
    readonly #locale: string

    constructor(locale: string) {
        this.#locale = locale;
    }

    get shortLocale() {
        return this.#locale.split('-')[0].toLowerCase();
    }
    
    // static isAllowedLocales(){
    //     return !!this.#locale;
    // }

    parse(text: string): TextParsedData {
        text = text.trim();
        
        if (!text) {
            return {
                sourceText: text,
                cleanText: '',
                date: null,
                // error: browser.i18n.getMessage('errorNoSpeechText'), //при принудительной остановке выскакивало 
                error: null, 
            };
        }

        let result;
        
        if (allowedDateParserLocales.some(locale => [this.#locale, this.shortLocale].includes(locale))) {
            result = this.#tryChronoParse(text) ?? this.#tryMicrosoftParse(text);

            if (result && result.parserSource !== 'microsoft' && !result.date && text === result?.cleanText) {
                result = this.#tryMicrosoftParse(text);
            }
        }

        // Оставляем правильную фильтрацию прошлых дат (не используем т.к. создается ощущение тчо не работает, когда в сегодняшнем дне вызываешь дату на час раньше к примеру)
        // if (result?.date && result.date.getTime() < Date.now()) {
        //     result = null;
        // }

        return result ?? {
            sourceText: text,
            cleanText: this.#cleanText(text, '', this.shortLocale),
            date: null,
            error: null,
        };
    }

    #tryChronoParse(text: string): TextParsedData | null {
        try {
            const sublocale = this.#locale.split('-')[1];

            let localeChrono: typeof chrono = chrono[this.shortLocale as keyof typeof chrono] as unknown as typeof chrono;
            // @ts-ignore
            localeChrono = localeChrono[sublocale] ?? localeChrono;
            
            const results = localeChrono?.parse(text, new Date, {forwardDate: true});
            console.log('chrono:', results);

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
            console.log('microsoft:', msCulture, msResults);

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

    #cleanText(fullText: string, dateText: string, locale: string): string {
        let cleaned = fullText.replace(/\s+/g, ' ');

        // 1. СНАЧАЛА удаляем дату (вместе с предлогами)
        if (dateText) {
            const escapedDate = dateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const TIME_PREPOSITIONS: Record<string, string> = {
                ru: '(?:в|во|на|через|после|спустя|за|до|к|с|со|от|около|примерно|ровно|в этот|в тот|в следующий|в прошлый|в ближайший)',
                en: '(?:in|on|at|by|for|since|from|after|before|within|during|through|about|around|exactly)',
                de: '(?:in|um|auf|bei|nach|vor|bis|ab|seit|innerhalb|während|gegen|ungefähr|genau)',
                fr: '(?:dans|à|en|sur|pour|depuis|après|avant|pendant|vers|environ|exactement)',
                es: '(?:en|el|a|para|por|desde|hasta|después|antes|durante|hacia|aproximadamente|exactamente)',
                it: '(?:in|a|per|da|dopo|prima|durante|verso|circa|esattamente|tra|fra)',
                pt: '(?:em|a|para|por|desde|até|depois|antes|durante|sobre|aproximadamente|exatamente)',
                nl: `(?:in|om|op|aan|bij|na|voor|binnen|tijdens|ongeveer|precies)`,
                zh: '(?:在|于|到|前|后|从|自|当|大约|正好)',
                ja: '(?:次の|今度の|来週の|先週の|今月の|来月の)?',
                ko: '(?:에|에서|부터|까지|후|전|중|약|정확히)'
            };
            
            const POST_PARTICLES: Record<string, string> = {
                ja: '(?:に|で|から|まで|後|前|中|約|ちょうど|は|が|を|の|と|へ)',
                es: '(?:\\s+el|\\s+la|\\s+los|\\s+las)?',
                pt: '(?:\\s+o|\\s+a|\\s+os|\\s+as)?',
            };
            
            const prepPattern = TIME_PREPOSITIONS[locale] || TIME_PREPOSITIONS.en;
            const postPattern = POST_PARTICLES[locale] || '';
            let dateRegex;
            
            if (postPattern) {
                // Для языков с частицами ПОСЛЕ даты 
                dateRegex = new RegExp(`\\s*${prepPattern}\\s*${escapedDate}${postPattern}\\s*|\\s*${escapedDate}${postPattern}\\s*|\\s*${prepPattern}\\s*${escapedDate}\\s*|\\s*${escapedDate}\\s*`, 'gi');
            } else {
                dateRegex = new RegExp(`\\s*${prepPattern}\\s+${escapedDate}\\s*|\\s*${escapedDate}\\s*`, 'gi');
            }
            
            cleaned = cleaned.replace(dateRegex, ' ')
                .replace(/\s+/g, ' ').trim();
        }

        // 2. ПОТОМ удаляем триггеры (теперь строка начинается с "Напомни о чём-нибудь")
        const triggerPatterns= TRIGGER_PATTERNS[locale] || [];
        
        if (triggerPatterns.length) {
            const triggerPattern = triggerPatterns.map(r => `(?:${r}\\s+)`).join('|')
            
            let prevLength;
            do {
                prevLength = cleaned.length;
                // Удаляем триггеры в начале строки
                const startTriggerRegex = new RegExp(`^\\s*(?:${triggerPattern})`, 'gi');
                cleaned = cleaned.replace(startTriggerRegex, '')
                    .replace(/\s+/g, ' ').trim();
               
            } while (cleaned.length !== prevLength);
        }

        
        //Тогда ломается кейсы типа "Сегодня в 8:00 в гараже убраться
        // ✅ Предлоги и артикли для удаления (только в начале/конце)
        // const REMOVABLE_WORDS:Record<string, string> = {
        //     ru: 'в|во|на|с|со|к|у|за|по|из|от|до|для|без|о|об|про|а|и|но|или|же|ли|ведь|вот|это|эти|этого|этому|этим',
        //     en: 'a|an|the|in|on|at|for|to|with|by|from|of|off|out|over|under|and|or|but',
        //     de: 'der|die|das|den|dem|des|ein|eine|einer|eines|einem|in|auf|bei|mit|nach|von|zu|aus|durch|für|ohne|und|oder|aber',
        //     fr: 'le|la|les|un|une|des|du|de|à|au|aux|en|dans|sur|sous|avec|sans|pour|par|et|ou|mais',
        //     es: 'el|la|los|las|un|una|unos|unas|de|del|a|al|en|sobre|bajo|con|sin|por|para|y|o|pero',
        //     it: 'il|lo|la|i|gli|le|un|uno|una|un\'|di|a|da|in|con|su|per|tra|fra|e|o|ma',
        //     pt: 'o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|por|para|com|sem|sobre|e|ou|mas',
        //     nl: 'de|het|een|in|op|aan|bij|met|van|uit|naar|voor|door|over|onder|en|of|maar',
        //     zh: '的|了|在|和|就|个|也|很',
        //     ja: 'の|は|が|を|に|で|と|から|まで|より|も|や|か|ね|よ',
        //     ko: '의|는|가|을|를|에|에서|으로|로|와|과|랑|하고|도|만|부터|까지'
        // };
        //
        // // 3. Удаляем стоп-слова только в начале и конце
        // const removableWords = REMOVABLE_WORDS[locale];
        // if (removableWords) {
        //     let prevLength;
        //     do {
        //         prevLength = cleaned.length;
        //         cleaned = cleaned.replace(new RegExp(`^(?:${removableWords})\\s+`, 'gi'), '').trim();
        //         cleaned = cleaned.replace(new RegExp(`^(?:${removableWords})$`, 'gi'), '').trim();
        //     } while (cleaned.length !== prevLength);
        // }

        // 4. Финальная очистка
        cleaned = cleaned.replace(/[\s,-.:;]+/g, ' ')
            .trim()
            .replace(/\S/, (char) => char.toLocaleUpperCase());

        return cleaned || fullText.trim();
    }
    
}