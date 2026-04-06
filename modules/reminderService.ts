import {
    localDateFormat,
    localTimeUntil,
    reminderIdToAlarmName,
    detectLocale,
    getUniversalLocalTimeString, isNumeric
} from "./utils/helpers";
import {Reminder, ReminderRepository} from "./reminderRepository.js";
import {browser} from 'wxt/browser';
import {getExpiredCountStore} from "@/modules/utils/storage";
import RRuleService from "@/modules/rRuleService";
import { VuetifyDateAdapter } from 'vuetify/date/adapters/vuetify'

export class ReminderService {
    readonly repository: ReminderRepository;
    static #instance: ReminderService;

    private constructor() {
        this.repository = new ReminderRepository();
    }

    static instance() {
        return ReminderService.#instance ??= new ReminderService();
    }

    get regionLocale(): string {
        return detectLocale();
    }

    async #updatedCallback(reminder?: Reminder){
        try{
            await getExpiredCountStore().setValue(
                this.getExpiredReminders(new Date(), true).length
            );
        } catch (error){
            console.error(error);
        }
    }

    async save(params: Partial<Reminder>, sendMessage?: boolean): Promise<number>;
    async save(id: number, params: Partial<Reminder>, sendMessage?: boolean): Promise<number>;
    async save(
        idOrParams: number | Partial<Reminder>,
        paramsOrSendMessage?: Partial<Reminder> | boolean,
        sendMessage: boolean = true
    ): Promise<number>
    {
        let id: number | undefined;
        let reminderParams: Partial<Reminder>;
        let shouldSendMessage: boolean|undefined;

        // Определяем, как были переданы параметры
        if (typeof idOrParams === 'number' || isNumeric(idOrParams)) {
            // Первый вариант: (id, params, sendMessage?)
            id = +idOrParams;
            reminderParams = paramsOrSendMessage as Partial<Reminder>;
            shouldSendMessage = sendMessage;
        } else {
            // Второй вариант: (params, sendMessage?)
            id = idOrParams.id;
            reminderParams = idOrParams;
            // Проверяем, является ли второй параметр булевым значением
            shouldSendMessage = typeof paramsOrSendMessage === 'boolean'
                ? paramsOrSendMessage
                : sendMessage;
        }

        shouldSendMessage ??= true;
        
        const isUpdated = !!id;
        
        if (id){
            await this.repository.update(id, reminderParams); //update не возвращает ID !!!
        } else {
            id = await this.repository.add(reminderParams);
        }

        reminderParams.completed = +reminderParams.datetime! >= Date.now() ? 0 : reminderParams.completed; //обязательно должно быть перед блоком ниже, иначе не сработает alert, если восстанавливаешь из завершенных

        try {
            if (reminderParams.datetime && !reminderParams.completed){
                await this.createAlarm(id, reminderParams.datetime)
            }

            if (shouldSendMessage) {
                if (reminderParams.googleSync === 0 || reminderParams.recurrencePause){
                    browser.runtime.sendMessage({
                        action : 'GOOGLE_DELETE_EVENT',
                        reminderId: id
                    })
                } else {
                    browser.runtime.sendMessage({
                        action : isUpdated ? 'GOOGLE_UPDATE_EVENT' : 'GOOGLE_CREATE_EVENT',
                        reminderId: id
                    })
                }
            }

            await this.#updatedCallback();
        } catch(error){
            console.error(error);
        }
        
        return id;
    }
    
    async recurrencePauseToggle(reminder: Reminder){
        if (!reminder?.recurrence){
            return;
        }

        await this.save(reminder.id!, {
            // @ts-ignore
            recurrencePause: !reminder.recurrencePause,
            datetime: await this.getNextOccurrence(reminder) ?? reminder.datetime,
        }, true);
    }
    
    async createAlarm(reminderId: number, datetime: Date) {
        return await browser.alarms.create(reminderIdToAlarmName(reminderId), {
            when: +datetime,
        })
    }
    
    async delete(reminder: Reminder, sendMessage: boolean = true) {
        await this.repository.delete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        sendMessage && browser.runtime.sendMessage({ action : 'GOOGLE_DELETE_EVENT', reminderId: reminder.id});
        await this.#updatedCallback();
    }

    async complete(reminder: Reminder, sendMessage: boolean = true) {
        await this.repository.complete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        sendMessage && browser.runtime.sendMessage({ action : 'GOOGLE_DELETE_EVENT', reminderId: reminder.id});
        await this.#updatedCallback();
    }

    async getAllGoogleEventsIds(){
        return await this.repository.pluck('googleEventId');
    }

    getLocalTime(reminderItem: Reminder) {
        return new Date(reminderItem.datetime).toLocaleTimeString(this.regionLocale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getPreviewTitle(reminderItem: Reminder, prependDate: boolean = true) {
        const dateFormatted = ! prependDate ? '' : localDateFormat(reminderItem.datetime, true, this.regionLocale);
        return `${dateFormatted}\n${reminderItem.title}\n\n${reminderItem.desc || ''}\n\n${reminderItem.url || ''}`.replace(/\n{3,}/, '\n\n').trim();
    }

    getTimeUntil(reminderItem: Reminder, now = new Date()) {
        return localTimeUntil(reminderItem.datetime, this.regionLocale, now);
    }

    getExpiredReminders(now = new Date(), excludePaused = false) {
        return this.repository.state.active
            .filter(item => !item.completed && item.datetime < now 
                && (!excludePaused || !item.recurrencePause)
            );
    }

    async getNextOccurrence(reminderOrId: Reminder|number, nowDate = new Date()): Promise<Date|null> {
        const reminder = typeof reminderOrId === 'number' ? await this.repository.getById(reminderOrId) : reminderOrId;
 
        if (!reminder){
            return null;
        }
        
        if (reminder.datetime > nowDate){
            return reminder.datetime;
        }
        
        const dateAdapter = new VuetifyDateAdapter({locale: this.regionLocale});
        const adapterReminderDate = dateAdapter.date(reminder.datetime);
        let nextDate: Date|null = reminder.datetime;
        
        if (reminder.recurrence?.length) {
            const fromTime = reminder.recurrenceFromTime;
            const toTime = reminder.recurrenceToTime;
            let tempLastNextDate: Date|null = nextDate;

            do {
                nextDate = RRuleService.getNextOccurrence(nextDate, reminder.recurrence, nowDate);
                const adapterNextDate = dateAdapter.date(nextDate);
                const nextTime = nextDate ? getUniversalLocalTimeString(nextDate) : null;

                if (fromTime && toTime && nextDate && nextDate > nowDate){
                    const needAppendDay = nextTime && nextTime > toTime;
                    const [hours, minutes] = fromTime.split(':');
                    
                    if (needAppendDay){
                        nextDate.setDate(nextDate.getDate() + 1)
                    }

                    if (dateAdapter.isAfterDay(adapterNextDate!, adapterReminderDate!) || needAppendDay){
                        nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    }
                }
                
                if (nextDate && nextDate === tempLastNextDate){
                    nextDate.setMinutes(nextDate.getMinutes() + 1); //просто защита от случайного зацикливания
                }
            } while (nextDate && nextDate <= nowDate)
        }
        
        return nextDate && nextDate > nowDate ? nextDate : null;
    }

    hasExpiredReminders(now = new Date()) {
        return this.repository.state.active.some(item => !item.completed && item.datetime < now);
    }
}
