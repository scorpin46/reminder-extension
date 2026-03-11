import { localDateFormat, localTimeUntil, reminderIdToAlarmName, detectLocale} from "./utils/helpers";
import {reactive} from "vue";
import {Reminder, ReminderRepository} from "./repositories/reminderRepository.js";
import {RecognitionService} from "./recognitionService.js";
import {browser} from 'wxt/browser';
import {getStoredAllowGoogleSync} from "./utils/storage";

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

    async saveReminder(params: Partial<Reminder>, sendMessage?: boolean): Promise<number>;
    async saveReminder(id: number, params: Partial<Reminder>, sendMessage?: boolean): Promise<number>;
    async saveReminder(
        idOrParams: number | Partial<Reminder>,
        paramsOrSendMessage?: Partial<Reminder> | boolean,
        sendMessage: boolean = true
    ): Promise<number>
    {
        let id: number | undefined;
        let reminderParams: Partial<Reminder>;
        let shouldSendMessage: boolean;

        // Определяем, как были переданы параметры
        if (typeof idOrParams === 'number') {
            // Первый вариант: (id, params, sendMessage?)
            id = idOrParams;
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

        const isUpdated = !!id;

        if (id){
            await this.repository.update(id, reminderParams); //update не возвращает ID !!!
        } else {
            id = await this.repository.add(reminderParams);
        }
        
        if (reminderParams.datetime && !reminderParams.completed){
            await browser.alarms.create(reminderIdToAlarmName(id), {when: +reminderParams.datetime});
        }
        
        const allowSync = await getStoredAllowGoogleSync().getValue();

        if (shouldSendMessage && allowSync) {
            browser.runtime.sendMessage({ 
                action : isUpdated ? 'googleUpdateEvent' : 'googleCreateEvent',
                reminderId: id
            })
        }

        return id;
    }
    
    async deleteReminder(reminder: Reminder, sendMessage: boolean = true) {
        await this.repository.delete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        sendMessage && browser.runtime.sendMessage({ action : 'googleDeleteEvent', googleEventId: reminder.googleEventId});
    }

    async completeReminder(reminder: Reminder, sendMessage: boolean = true) {
        await this.repository.complete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        sendMessage && browser.runtime.sendMessage({ action : 'googleDeleteEvent', googleEventId: reminder.googleEventId});
    }

    async getAllGoogleEventsIds(){
        return await this.repository.pluck('googleEventId');
    }

    reminderLocalTime(reminderItem: Reminder) {
        return new Date(reminderItem.datetime).toLocaleTimeString(this.regionLocale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    reminderPreviewTitle(reminderItem: Reminder) {
        const dateFormatted = localDateFormat(reminderItem.datetime, true, this.regionLocale);
        return `${dateFormatted}\n${reminderItem.title}`;
    }

    reminderTimeUntil(reminderItem: Reminder, now = new Date()) {
        return localTimeUntil(reminderItem.datetime, this.regionLocale, now);
    }
}
