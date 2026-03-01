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

let instance;

export class ReminderService {
    public readonly repository: ReminderRepository;
    
    private constructor() {
        this.repository = new ReminderRepository();
        
        this.loadStoreVars()
    }

    static instance() {
        instance ??= new ReminderService();
        
        if (typeof window !== 'undefined'){
            state.recognitionService ??= instance.initRecognitionService();
        }

        return instance;
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

    async saveReminder(params: Reminder) {
        let id = params.id;
        
        if (id){
            await this.repository.update(id, params); //update не возвращает ID !!!
        } else {
            id = await this.repository.add(params);
        }

        await this.scheduleNotification(id, params.datetime as Date);
        state.recognitionService?.resetState();

        return id;
    }
    
    async deleteReminder(id: number) {
        await this.repository.delete(id);
        browser.alarms.clear(reminderIdToAlarmName(id));
    }

    async completeReminder(id: number) {
        await this.repository.complete(id);
        browser.alarms.clear(reminderIdToAlarmName(id));
    }

    async scheduleNotification(id: number, when: Date|number) {
        browser.alarms.create(reminderIdToAlarmName(id), {
            when: +when
        });
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
}
