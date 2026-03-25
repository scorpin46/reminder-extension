import {browser} from 'wxt/browser';

export const localTimeUntil = (dateObj: Date, locale: Intl.LocalesArgument, now = new Date()) => {
    const diffInMs = dateObj.getTime() - now.getTime();
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    // Пороговые значения в миллисекундах
    const thresholds = [
        { limit: 60 * 1000, unit: 'second', divisor: 1000 },              // < 1 минуты
        { limit: 60 * 60 * 1000, unit: 'minute', divisor: 60 * 1000 },    // < 1 часа
        { limit: 24 * 60 * 60 * 1000, unit: 'hour', divisor: 60 * 60 * 1000 } // < 1 дня
    ];

    const absMs = Math.abs(diffInMs);

    for (const { limit, unit, divisor } of thresholds) {
        if (absMs < limit) {
            // @ts-ignore
            return rtf.format(Math.round(diffInMs / divisor), unit);
        }
    }

    // Для дней нормализуем даты
    const dayInMs = 24 * 60 * 60 * 1000;
    const normalize = (d: Date) => Math.floor(d.getTime() / dayInMs);

    const diffInDays = normalize(dateObj) - normalize(now);
    
    return rtf.format(diffInDays, 'day');
}

//некорректно писала "Сегодня", хотя это уже должно было стать вчера (сейчас 01:15, а событие 23:55)
// export const localDateFormat = (date:Date|string, withTime: boolean, locale: string, nearRelativeDay:boolean = false) => {
//     const dateObj = date instanceof Date
//         ? date
//         : new Date(new Date(date).getTime() + new Date().getTimezoneOffset());
//
//     const currentYear = new Date().getFullYear();
//     const dateYear = dateObj.getFullYear();
//
//     const options: Intl.DateTimeFormatOptions = {
//         weekday: 'long',
//         day: 'numeric',
//         month: 'long'
//     }
//
//     if (withTime){
//         options.hour = '2-digit';
//         options.minute = '2-digit';
//     }
//
//     if (dateYear !== currentYear) {
//         options.year = 'numeric';
//     }
//
//     const formattedDate = dateObj.toLocaleDateString(locale, options);
//
//     if (nearRelativeDay){
//         const diffInMs = dateObj.getTime() - Date.now();
//         const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
//
//         if (diffInDays >= -1 && diffInDays <= 1) {
//             const rtf = new Intl.RelativeTimeFormat(locale, {
//                 numeric: 'auto'
//             });
//
//             const relativeDay = rtf.format(diffInDays, 'day');
//             const capitalized = relativeDay.charAt(0).toUpperCase() + relativeDay.slice(1);
//
//             return `${capitalized}`;
//         }
//     }
//
//     return formattedDate
// }

export const localDateFormat = (date: Date | string, withTime: boolean, locale: string, nearRelativeDay: boolean = false) => {
    const dateObj = date instanceof Date
        ? date
        : new Date(date); // Просто создаем дату из строки, без смещения

    const currentYear = new Date().getFullYear();
    const dateYear = dateObj.getFullYear();

    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }

    if (withTime){
        options.hour = '2-digit';
        options.minute = '2-digit';
    }

    if (dateYear !== currentYear) {
        options.year = 'numeric';
    }

    const formattedDate = dateObj.toLocaleDateString(locale, options);

    if (nearRelativeDay) {
        // Сравниваем даты по местному времени (без времени)
        const now = new Date();

        const dateObjDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffInDays = Math.round((dateObjDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays >= -1 && diffInDays <= 1) {
            const rtf = new Intl.RelativeTimeFormat(locale, {
                numeric: 'auto'
            });

            const relativeDay = rtf.format(diffInDays, 'day');
            const capitalized = relativeDay.charAt(0).toUpperCase() + relativeDay.slice(1);

            return capitalized;
        }
    }

    return formattedDate;
}

export const detectLocale = () => {
    let results = [];
    if (typeof browser !== 'undefined' && browser.i18n) {
        results.push(browser.i18n.getUILanguage());
    }

    results = [navigator.language, ... navigator.languages].filter(Boolean);

    let locale = results[0] || 'en-US';

    if (locale.includes('-')) {
        return locale;
    }

    return results.find(l => l.startsWith(locale) && l.includes('-')) || locale;
}

export const reminderNotificationPrefix = 'reminder_';


export const reminderIdToAlarmName = (reminderId: number, type: string = 'default') => {
    return `${reminderNotificationPrefix}${reminderId}#type-${type}`
}

export const getReminderIdFromAlarmName = (alarmName: string) => {
    if (alarmName.startsWith(reminderNotificationPrefix)) {
        return parseInt(alarmName.replace(reminderNotificationPrefix, ''));
    }
    
    return null;
}

export const processInBatches = async <T>(
    items: T[],
    itemCallback: (item: T) => Promise<any>,
    batchSize = 5,
    delayMs = 1000
): Promise<PromiseSettledResult<any>[]> => {
    const results: PromiseSettledResult<any>[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
            batch.map(item => itemCallback(item))
        );

        results.push(...batchResults);

        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const blockPageScaling = () => {
    // Блокировка Ctrl + колесико мыши
    document.addEventListener('wheel', function(event) {
        if (event.ctrlKey || event.metaKey) { // metaKey для Mac (Cmd)
            event.preventDefault();
        }
    }, { passive: false, capture: true });

    // Блокировка клавиатурных сочетаний масштабирования
    document.addEventListener('keydown', function(event) {
        // Проверяем зажат ли Ctrl (или Cmd на Mac)
        if (event.ctrlKey || event.metaKey) {
            // Проверяем клавиши: +, -, = (обычно = это + без Shift)
            // Используем event.key вместо устаревшего keyCode
            const key = event.key;

            // '+' может быть '=' (без Shift) или '+' (с Shift)
            // '-' может быть '-' или '_'
            if (key === '+' || key === '-' || key === '=' || key === '_') {
                event.preventDefault();
            }

            // Также блокируем колесико мыши при зажатом Ctrl/Cmd
            // (это уже обрабатывается в wheel событии выше)
        }
    }, { capture: true });

    // Дополнительная блокировка для сенсорных панелей (pinch-to-zoom)
    // Предотвращаем жест сжатия/растяжения на тачпадах
    document.addEventListener('gesturestart', function(event) {
        event.preventDefault();
    }, { passive: false });

    // Блокировка двойного тапа для масштабирования на мобильных
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false, capture: true });

    // Блокировка мультитач жестов (pinch)
    document.addEventListener('touchmove', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false, capture: true });
}

export const isNumeric = (value: any): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(value);
}