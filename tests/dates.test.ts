import { describe, it, expect, vi, beforeEach  } from 'vitest';
import {VuetifyDateAdapter} from "vuetify/date/adapters/vuetify";
import RRuleService from "@/modules/rRuleService";
import {ReminderService} from "@/modules/reminderService";
import {Reminder} from "@/modules/reminderRepository";
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('check dates', () => {
    beforeEach(() => {
        // Мокаем прямо перед тестом
        vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('ru-RU');
    });
    
    it('RRuleService.getNextOccurrence возвращает данные корректно', () => {
        const ts = 1775410920000;
        // const dateString = '05.04.2026 20:42:00';
        const date = new Date(ts); 
        
        expect(RRuleService.getNextOccurrence(date, 'RRULE:FREQ=HOURLY')?.getTime()).toBe(ts + 1000 * 3600);
    });
    
    it('ReminderService.getNextOccurrence возвращает данные корректно', async () => {
        const reminderService = ReminderService.instance();
        
        const reminder: Reminder = {
            "datetime": new Date("2026-04-05T18:43:00.000Z"),
            "title": "tttre",
            "desc": "",
            "googleSyncDate": new Date("2026-04-05T18:41:59.638Z"),
            "googleEventId": "3ta50cdajts19i64dgpeluhuta",
            "createdAt": new Date("2026-04-04T10:20:17.246Z"),
            "updatedAt": new Date("2026-04-05T18:43:00.030Z"),
            "id": 556,
            "url": null,
            "googleSync": 1,
            "recurrence": "RRULE:FREQ=MINUTELY;INTERVAL=5",
            "recurrenceFromTime": "09:00",
            "recurrenceToTime": "17:00",
            "recurrencePause": 0,
            "completed": 0
        }
        let nextDate;
        
        nextDate = await reminderService.getNextOccurrence(reminder);
        expect(nextDate).toStrictEqual(new Date(`2026-04-06T${reminder.recurrenceFromTime}`));

        nextDate = await reminderService.getNextOccurrence({...reminder, datetime: new Date("2026-04-05T09:50:00+03:00")});
        expect(nextDate).toStrictEqual(new Date(`2026-04-06T09:00:00+03:00`));

        nextDate = await reminderService.getNextOccurrence({...reminder, datetime: new Date("2026-04-06T09:50:00+03:00")});
        expect(nextDate).toStrictEqual(new Date(`2026-04-06T09:50:00+03:00`));

        nextDate = await reminderService.getNextOccurrence({...reminder, datetime: new Date("2026-04-06T09:50:00+03:00")}, new Date("2026-04-06T09:50:00+03:00"));
        expect(nextDate).toStrictEqual(new Date(`2026-04-06T09:55:00+03:00`));
    });
    
    it('helper isLastDayOfMonth корректно определяет конец месяца', () => {
        const date1 = new Date(1777581000000); //'2026-04-30 23:30' (UTC+3)
        const date2 = new Date(1777541400000); //'2026-04-30 00:30' (UTC+3)
        const date3 = new Date(1777584600000); //'2026-05-01 00:30' (UTC+3)
        
        const dateAdapter = new VuetifyDateAdapter({locale: 'ru-RU'});
        const isLastDayOfMonth = (date: Date) => {
            const aDate = dateAdapter.date(date);
            return dateAdapter.isSameDay(aDate!, dateAdapter.endOfMonth(aDate!));
        }
        
        expect(isLastDayOfMonth(date1)).toBe(true);
        expect(isLastDayOfMonth(date2)).toBe(true);
        expect(isLastDayOfMonth(date3)).toBe(false);
    });
});