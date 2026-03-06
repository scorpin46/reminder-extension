import { localDateFormat, localTimeUntil, reminderIdToAlarmName, detectLocale} from "./utils/helpers";
import {reactive} from "vue";
import {Reminder, ReminderRepository} from "./repositories/reminderRepository.js";
import {RecognitionService} from "./recognitionService.js";
import {browser} from 'wxt/browser';
import type {TextParsedData} from "./textParserProvider";
import {getStoredLocale} from "./utils/storage";

const state: {
    locale: string;
    supportsRecording: boolean;
    recognitionService?: RecognitionService;
} = reactive({
    locale: detectLocale(),
    supportsRecording: false,
    recognitionService: undefined,
});


export class ReminderService {
    public readonly repository: ReminderRepository;
    private static _instance: ReminderService;
    
    private constructor() {
        this.repository = new ReminderRepository();
        
        this.loadStoreVars()
    }

    static instance() {
        ReminderService._instance ??= new ReminderService();
        
        if (typeof window !== 'undefined'){
            state.recognitionService ??= ReminderService._instance.initRecognitionService();
        }

        return ReminderService._instance;
    }

    initRecognitionService() {
        const recognitionInstance = new RecognitionService(state.locale);
        
        state.supportsRecording = recognitionInstance.isSupported();
        
        return recognitionInstance;
    }

    get isRecording(): boolean|undefined {
        return state.recognitionService?.state.isRecording;
    }

    get streamRecordingText(): string|undefined {
        return state.recognitionService?.state.streamRecordingText;
    }

    get recordingError(): string|null|undefined {
        return state.recognitionService?.state.error;
    }

    get lastRecordingData(): TextParsedData | null | undefined{
        return state.recognitionService?.state.parsedData;
    }

    get regionLocale(): string {
        return state.locale;
    }

    get shortLocale(): string {
        return state.locale.split('-')[0];
    }

    get supportsRecording() {
        return state.supportsRecording;
    }

    get allowedLocaleLanguages(): object {
        return {
            "ru-RU": "Русский",
            "en-US": "English",
            "es-ES": "Español",
            "fr-FR": "Français",
            "de-DE": "Deutsch",
            "it-IT": "Italiano",
            "pt-BR": "Português",
            "zh-CN": "中文",
            "ja-JP": "日本語",
        };
    }

    resetLastRecordingData(){
        state.recognitionService?.resetState();
    }

    recordStart() {
        return state.recognitionService?.start();
    }

    recordStop() {
        state.recognitionService?.stop();
    }

    loadStoreVars() {
        getStoredLocale().getValue().then((value) => {
            if (value){
                state.locale = value
            }
        })
    }
    
    changeLocale(locale: string) {
        state.locale = locale;
        state.recognitionService?.updateLocale(locale);

        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale;
        }

        getStoredLocale().setValue(locale)
    }

    async saveReminder(params: Reminder): Promise<number>;
    async saveReminder(id: number, params: Partial<Reminder>): Promise<number>;
    async saveReminder(idOrParams: number | Reminder, params?: Partial<Reminder>): Promise<number>
    {
        let id: number | undefined;
        let reminderParams: Partial<Reminder>;
        
        if (typeof idOrParams === 'number') {
            id = idOrParams;
            reminderParams = params!;
        } else {
            id = idOrParams.id;
            reminderParams = idOrParams;
        }
        
        if (id){
            await this.repository.update(id, reminderParams); //update не возвращает ID !!!
            browser.runtime.sendMessage({ action : 'googleUpdateEvent', reminderId: id});
        } else {
            id = await this.repository.add(reminderParams);
            browser.runtime.sendMessage({ action : 'googleCreateEvent', reminder: id});
        }

        if (reminderParams.datetime){
            await this.scheduleNotification(id, reminderParams.datetime);
        }
        
        state.recognitionService?.resetState();

        return id;
    }
    
    async deleteReminder(reminder: Reminder) {
        await this.repository.delete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        browser.runtime.sendMessage({ action : 'googleDeleteEvent', googleEventId: reminder.googleEventId});
    }

    async completeReminder(reminder: Reminder) {
        await this.repository.complete(reminder.id!);
        browser.alarms.clear(reminderIdToAlarmName(reminder.id!));
        browser.runtime.sendMessage({ action : 'googleDeleteEvent', googleEventId: reminder.googleEventId});
    }

    async scheduleNotification(id: number, when: Date|number) {
        try {
            browser.alarms.create(reminderIdToAlarmName(id), {
                when: +when
            });
        } catch (e) {
            console.warn("Ошибка создания alarm в браузере", e);
        }
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
