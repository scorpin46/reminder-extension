import {browser} from 'wxt/browser';

export const getImproveExperienceFormLink = () => {
    return detectLocale().startsWith('ru')
        ? 'https://docs.google.com/forms/d/e/1FAIpQLSc_40i19uAtg5muHfCbyTKwXJJbAoeLrvqCiAtBeoJmU8nMnA/viewform'
        : 'https://docs.google.com/forms/d/e/1FAIpQLSetHCn34pZRZqb8bt0c4yX7II2AoNW7Q72qVquakqxTafNJJg/viewform'
}

export const openLink = (link: string, callback: any) => {
    browser.runtime.sendMessage({action: 'OPEN_LINK', url: link}, (response) => {
        typeof callback === 'function' ? callback(response) : null
    });
}

export const getOsMicSettingsLink = () => {
    const ua = navigator.userAgent;

    // Windows: только NT 6.2 (Windows 8) и выше
    const winMatch = ua.match(/Windows NT (\d+)\.(\d+)/);
    if (winMatch) {
        const major = parseInt(winMatch[1], 10);
        const minor = parseInt(winMatch[2], 10);
        const ntVersion = major + minor / 10;

        if (ntVersion >= 6.2) {
            return 'ms-settings:privacy-microphone';
        }
        return null;
    }

    // macOS: только 10.10 (Yosemite) и выше
    const macMatch = ua.match(/Mac OS X (\d+)[._](\d+)/);
    if (macMatch) {
        const major = parseInt(macMatch[1], 10);
        const minor = parseInt(macMatch[2], 10);
        const version = major + minor / 100;

        if (version >= 10.10) {
            return 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
        }
        return null;
    }

    // Linux, мобильные, старые Windows, старые macOS — null
    return null;
}

export const getOsNotifySettingsLink = () => {
    const ua = navigator.userAgent;

    // Windows: только NT 6.2 (Windows 8) и выше
    const winMatch = ua.match(/Windows NT (\d+)\.(\d+)/);
    if (winMatch) {
        const major = parseInt(winMatch[1], 10);
        const minor = parseInt(winMatch[2], 10);
        const ntVersion = major + minor / 10;

        if (ntVersion >= 6.2) {
            return 'ms-settings:notifications';
        }
        return null;
    }

    // macOS: только 10.10 (Yosemite) и выше
    const macMatch = ua.match(/Mac OS X (\d+)[._](\d+)/);
    if (macMatch) {
        const major = parseInt(macMatch[1], 10);
        const minor = parseInt(macMatch[2], 10);
        const version = major + minor / 100;

        if (version >= 10.10) {
            return 'x-apple.systempreferences:com.apple.preference.notifications';
        }
        return null;
    }

    // Linux, мобильные, старые Windows, старые macOS — null
    return null;
};

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

export const getUniversalLocalTimeString = (dateObj: Date = new Date(), locale?: string) => {
    return dateObj.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // принудительно 24-часовой формат
    })
}

export const detectLocale = () => {
    let results = [];
    if (typeof browser !== 'undefined' && browser.i18n) {
        results.push(browser.i18n.getUILanguage());
    }

    results = [...results, navigator.language, ...navigator.languages].filter(Boolean);

    let locale = results[0] || 'en-US';

    if (locale.includes('-')) {
        return locale;
    }

    return results.find(l => l.startsWith(locale) && l.includes('-')) || locale;
}

export const reminderAlarmPrefix = 'alarm-';
export const reminderNotificationPrefix = 'notification-';

export const reminderIdToAlarmName = (reminderId: number, type: string = 'default') => {
    return `${reminderAlarmPrefix}${reminderId}#type-${type}`
}

export const getReminderIdFromAlarmName = (alarmName: string) => {
    if (alarmName.startsWith(reminderAlarmPrefix)) {
        return parseInt(alarmName.replace(reminderAlarmPrefix, ''));
    }
    
    return null;
}

export const reminderIdToNotificationId = (reminderId: number) => {
    return `${reminderNotificationPrefix}${reminderId}`;
}

export const getReminderIdFromNotificationId = (notificationId: string) => {
    if (notificationId.startsWith(reminderNotificationPrefix)) {
        return parseInt(notificationId.replace(reminderNotificationPrefix, ''));
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

export const isYandexBrowser = (): boolean => {
    return !!navigator?.userAgent?.includes('YaBrowser');
}

export const isEdge = (): boolean => {
    return /Edg/.test(navigator.userAgent);
}