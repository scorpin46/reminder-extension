import { localDateFormat, localTimeUntil, reminderIdToAlarmName, detectLocale} from "./utils/helpers";
import {Reminder, ReminderRepository} from "./reminderRepository.js";
import {browser} from 'wxt/browser';

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

        reminderParams.completed = +reminderParams.datetime! >= Date.now() ? 0 : reminderParams.completed; //обязательно должно быть перед блоком ниже, иначе не сработает alert, если восстанавливаешь из завершенных
        
        if (reminderParams.datetime && !reminderParams.completed){
            await browser.alarms.create(reminderIdToAlarmName(id), {
                when: +reminderParams.datetime,
                periodInMinutes: reminderParams.repeatAfterMin,
            })
        }
        
        if (shouldSendMessage) {
            if (reminderParams.googleSync === 0){
                browser.runtime.sendMessage({
                    action : 'SAR__GOOGLE_DELETE_EVENT',
                    googleEventId: reminderParams.googleEventId
                })
            } else {
                browser.runtime.sendMessage({
                    action : isUpdated ? 'SAR__GOOGLE_UPDATE_EVENT' : 'SAR__GOOGLE_CREATE_EVENT',
                    reminderId: id
                })
            }
        }

        return id;
    }
    
    async delete(reminder: Reminder, sendMessage: boolean = true) {
        await this.repository.delete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        sendMessage && browser.runtime.sendMessage({ action : 'SAR__GOOGLE_DELETE_EVENT', googleEventId: reminder.googleEventId});
    }

    async complete(reminder: Reminder, sendMessage: boolean = true) {
        await this.repository.complete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        sendMessage && browser.runtime.sendMessage({ action : 'SAR__GOOGLE_DELETE_EVENT', googleEventId: reminder.googleEventId});
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

    getPreviewTitle(reminderItem: Reminder) {
        const dateFormatted = localDateFormat(reminderItem.datetime, true, this.regionLocale);
        return `${dateFormatted}\n${reminderItem.title}`.trim();
        // return `${dateFormatted}\n${reminderItem.title}\n${reminderItem.desc}\n\n${reminderItem.url}`.trim();
    }

    getTimeUntil(reminderItem: Reminder, now = new Date()) {
        return localTimeUntil(reminderItem.datetime, this.regionLocale, now);
    }
}
