import {RRuleSet, rrulestr} from "rrule";

export default class RRuleService {
    static getNextOccurrence(reminderDate: Date, rrule?: string|null|string[], afterDate: Date = new Date()) {
        const dtstart = reminderDate;

        if (! rrule?.length) {
            // Если это не повторяющееся событие, возвращаем его дату, если она в будущем
            return dtstart > afterDate ? dtstart : null;
        }

        rrule = typeof rrule === 'string' ? rrule.split('\n').filter(line => line.trim().length > 0) : rrule;
        // 3. Создаем RRuleSet — главный контейнер для всех правил
        const ruleSet = new RRuleSet();

        // 4. Разбираем массив recurrence и распределяем по типам
        for (const line of rrule) {
            if (line.startsWith('RRULE:')) {
                // Основное правило повторения
                const rrule = rrulestr(line, { dtstart: dtstart, forceset: false });
                ruleSet.rrule(rrule);
            }
            else if (line.startsWith('EXRULE:')) {
                // Правило-исключение (целая серия исключается)
                const exrule = rrulestr(line, { dtstart: dtstart, forceset: false });
                ruleSet.exrule(exrule);
            }
            else if (line.startsWith('RDATE:')) {
                // Дополнительные даты (добавляются в серию)
                const rdates = RRuleService.parseRDate(line);
                rdates.forEach(date => ruleSet.rdate(date));
            }
            else if (line.startsWith('EXDATE:')) {
                // Даты-исключения (удаляются из серии)
                const exdates = RRuleService.parseExDate(line);
                exdates.forEach(date => ruleSet.exdate(date));
            }
        }

        // 5. Получаем следующую дату после fromDate
        const nextDate = ruleSet.after(afterDate);

        return nextDate || null;
    }

    /**
     * Парсит RDATE строку в массив дат
     * @param {string} rdateString - Строка вида "RDATE:20260506T100000Z,20260507T100000Z"
     * @returns {Date[]} - Массив дат
     */
    static parseRDate(rdateString: string) {
        const dates = [];
        // Убираем префикс "RDATE:" и разделяем по запятым
        const valuePart = rdateString.substring(6);
        const parts = valuePart.split(',');

        for (const part of parts) {
            // Проверяем, является ли это периодом (содержит '/')
            if (part.includes('/')) {
                // PERIOD тип — Google Calendar API не поддерживает VALUE=PERIOD [citation:1]
                // Согласно документации API, такие значения игнорируются [citation:1]
                console.warn('RDATE with PERIOD value detected and will be skipped:', part);
                continue;
            }
            // Обычная дата
            const date = RRuleService.parseICalDateTime(part);
            if (date) dates.push(date);
        }
        return dates;
    }

    /**
     * Парсит EXDATE строку в массив дат
     * @param {string} exdateString - Строка вида "EXDATE:20260505T100000Z,20260506T100000Z"
     * @returns {Date[]} - Массив дат для исключения
     */
    static parseExDate(exdateString: string) {
        const dates = [];
        const valuePart = exdateString.substring(7);
        const parts = valuePart.split(',');

        for (const part of parts) {
            const date = RRuleService.parseICalDateTime(part);
            if (date) dates.push(date);
        }
        return dates;
    }

    /**
     * Парсит iCalendar формат даты/времени
     * @param {string} dateString - Строка вида "20260506T100000Z"
     * @returns {Date | null}
     */
    static parseICalDateTime(dateString: string) {
        // Формат: YYYYMMDDTHHMMSSZ (UTC)
        const match = dateString.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
        if (match) {
            const [_, year, month, day, hour, minute, second] = match;
            return new Date(Date.UTC(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
            ));
        }

        // Формат: YYYYMMDD (целый день)
        const dateMatch = dateString.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (dateMatch) {
            const [_, year, month, day] = dateMatch;
            return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }

        console.warn('Unrecognized date format:', dateString);
        return null;
    }
}