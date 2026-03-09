import {browser} from "wxt/browser";
import {
    getStoredAllowGoogleSync, 
    getStoredGoogleAuthAlertIdStore,
    getStoredGoogleIsAuthenticated,
    getStoredGoogleLastSyncTs,
    getStoredGoogleUser,
    GoogleUser
} from "./utils/storage";
import {ReminderService} from "./reminderService";
import type {Reminder} from "./repositories/reminderRepository";
import type {calendar_v3} from "@googleapis/calendar";
import axios, {AxiosInstance, AxiosError} from 'axios';
import rateLimit from 'axios-rate-limit';

type CalendarEvent = calendar_v3.Schema$Event;
type EventList = calendar_v3.Schema$Events;
type EventsRequest = calendar_v3.Params$Resource$Events$List;

export class GoogleCalendarService {
    private static _instance: GoogleCalendarService;

    public currentUser?: GoogleUser | null = null;
    private readonly requestTimeout: number = 5000;
    private readonly appNameForCalendar: string = 'set-a-reminder-ext';
    private abortController: AbortController | null = null;
    private readonly defaultEndTimeAppendMs: number = 1000;
    
    private googleUserStore: ReturnType<typeof getStoredGoogleUser>;
    private allowGoogleSyncStore: ReturnType<typeof getStoredAllowGoogleSync>;
    private googleLastSyncTsStore: ReturnType<typeof getStoredGoogleLastSyncTs>;
    private googleIsAuthenticatedStore: ReturnType<typeof getStoredGoogleIsAuthenticated>;
    private googleAuthAlertIdStore: ReturnType<typeof getStoredGoogleAuthAlertIdStore>;
    public static syncAlarmName?: string = 'syncUpdates';
    private lastActiveToken?: string | null;
    private axiosInstance: AxiosInstance;
    public reminderService: ReminderService;
    
    private constructor() {
        this.googleUserStore = getStoredGoogleUser();
        this.allowGoogleSyncStore = getStoredAllowGoogleSync();
        this.googleLastSyncTsStore = getStoredGoogleLastSyncTs();
        this.googleIsAuthenticatedStore = getStoredGoogleIsAuthenticated();
        this.googleAuthAlertIdStore = getStoredGoogleAuthAlertIdStore();
       
        this.reminderService = ReminderService.instance();
        this.abortController = new AbortController();

        this.googleUserStore.getValue().then(result => {
            this.currentUser = result;
        })
        this.googleUserStore.watch((newValue, oldValue) => {
            this.currentUser = newValue;
        })
        
        this.googleIsAuthenticatedStore.watch(async (newValue, oldValue) => {
            const user = await this.googleUserStore.getValue();

            if (oldValue && !newValue && user) {
                const notificationId = await browser.notifications.create({
                    type: "basic",
                    iconUrl: browser.runtime.getURL("/icon/128.png"),
                    title: "🔔 Set a Reminder",  //todo перевод
                    message: `Google синхронизация c ${user.email} нарушена, авторизуйтесь заново`, //todo или типо того
                    requireInteraction: true,
                    buttons: [{title: "Авторизоваться"}],
                });

                await this.googleAuthAlertIdStore.setValue(notificationId);
            } else if (newValue) {
                await this.googleAuthAlertIdStore.removeValue();
            }
        })

        this.axiosInstance = rateLimit(
            axios.create({
                timeout: this.requestTimeout,
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: this.abortController.signal
            }),
            {
                maxRequests: 5,
                perMilliseconds: 1000
            }
        );

        // Перехватчик для добавления токена
        this.axiosInstance.interceptors.request.use(async (config) => {
            if (!this.currentUser){
                return config;
            }
            
            this.lastActiveToken ??= await this.fetchToken(false);
            
            if (this.lastActiveToken) {
                config.headers.Authorization = `Bearer ${this.lastActiveToken}`;
            }
            
            return config;
        });

        // Перехватчик для обработки ошибок
        this.axiosInstance.interceptors.response.use(
            response => response,
            this.handleAxiosError.bind(this)
        );
    }
    
    static instance(){
        return GoogleCalendarService._instance ??= new GoogleCalendarService();
    }

    private get timeZone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // Обработка ошибок axios
    async handleAxiosError(error: AxiosError): Promise<never> {
        if (error.code === 'ECONNABORTED') {
            console.error('⏱️ Таймаут запроса');
            throw new Error('Request timeout');
        }

        if (error.message === 'Network Error') {
            console.error('🌐 Сетевая ошибка');
            throw new Error('Network error');
        }

        if (error.response) {
            // Сервер ответил с ошибкой
            const status = error.response.status;
            const data = error.response.data as any;

            if (status === 401) {
                await this.fetchToken(false).then(token => {
                    this.lastActiveToken = token;
                })
            } else if (status === 429) {
                console.error('⚠️ Превышен лимит запросов');
                throw new Error('Rate limit exceeded');
            }

            throw new Error(`API Error ${status}: ${data?.error?.message || 'Unknown error'}`);
        }

        throw error;
    }

    async run(): Promise<void> {
        console.log('🚀 Запуск GoogleCalendarService');

        this.startPolling();
        this.syncUpdates(); //для первого быстрого запуска (мб убрать?)
    }

    async startPolling(): Promise<void> {
        const min = 1;

        browser.alarms.create(GoogleCalendarService.syncAlarmName, {
            periodInMinutes: min,
        });
    }

    async login(): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            this.lastActiveToken = await this.fetchToken(true);

            const userInfo = await this.fetchUserInfo();
            
            if (!userInfo) {
                throw new Error('Failed to get user info');
            }

            await this.googleUserStore.setValue(userInfo);

            console.log(`✅ Аккаунт закреплен: ${userInfo.email}`);
            await this.startPolling();

            return { success: true, user: userInfo };
        } catch (error: any) {
            console.error('Ошибка входа:', error);

            let errorMessage = error.message;
            if (error.message.includes('network')) {
                errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
            } else if (error.message.includes('auth')) {
                errorMessage = 'Ошибка авторизации. Попробуйте снова.';
            }

            return { success: false, error: errorMessage };
        }
    }

    async logout(): Promise<{ success: boolean }> {
        try {
            this.abortController?.abort();
            this.abortController = new AbortController();
            browser.alarms.clear(GoogleCalendarService.syncAlarmName);
            await this.googleUserStore.removeValue();

            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });

        } catch (e) {
            console.error('Error during logout:', e);
        }

        this.lastActiveToken = undefined;

        console.log('👋 Выход выполнен');

        return { success: true };
    }

    async getEvents(maxResults: number = 2500): Promise<CalendarEvent[]> {
        const params = new URLSearchParams({
            maxResults: maxResults.toString(),
            timeZone: this.timeZone,
            orderBy: 'startTime',
            singleEvents: 'true',
            showDeleted: 'true',
            privateExtendedProperty: `appName=${this.appNameForCalendar}`
        });

        const response = await this.axiosInstance.get(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        )

        return response.data.items || [];
    }

    async createEvent(summary: string, description: string, startTime: Date, endTime?: Date): Promise<CalendarEvent | null | undefined> {
        try {
            if (! await this.syncAllowed()) return

            endTime ??= new Date(startTime.getTime() + this.defaultEndTimeAppendMs);

            const event = {
                summary,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: this.timeZone
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: this.timeZone
                },
                description: description,
                transparency: 'transparent',
                visibility: 'private',
                extendedProperties: {
                    private: {
                        appName: this.appNameForCalendar
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [{ method: 'popup', minutes: 0 }]
                }
            };

            const response = await this.axiosInstance.post(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                event,
            )

            return response.data;
        } catch (e) {
            console.error(e);
        }
        
        return null;
    }

    async updateEvent(eventId: string, summary: string, description: string, startTime: Date, endTime?: Date): Promise<CalendarEvent | null | undefined> {
        try {
            if (!eventId || ! await this.syncAllowed()) return

            endTime ??= new Date(startTime.getTime() + this.defaultEndTimeAppendMs);

            const event: CalendarEvent = {
                summary,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: this.timeZone
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: this.timeZone
                },
                description: description,
                //тут настройки видимости перебивать не буду (вдруг юзер сам поменял для удобства)
                // transparency: 'transparent',
                // visibility: 'private',
            };

            const response = await this.axiosInstance.put(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                event,
            )

            return response.data;
        } catch (error) {
            console.error('Error updating event:', error);
            return null;
        }
    }

    async updateEventByReminder(reminder: Reminder | null | undefined): Promise<void> {
        if (!reminder) {
            console.debug('Напоминание не найдено, пропускаем обновление события');
            return;
        }

        if (!await this.syncAllowed()) return;

        if (reminder.googleSync === 0 || !reminder.googleEventId) return;

        try {
            const event = await this.updateEvent(
                reminder.googleEventId,
                reminder.title,
                reminder.desc || '',
                reminder.datetime
            );

            if (event?.updated) {
                await this.reminderService.saveReminder(reminder.id!, {
                    googleSyncDate: new Date(event.updated)
                }, false);
            }
        } catch (error) {
            console.error('Error updating event from reminder:', error);
            // Не пробрасываем ошибку дальше, чтобы не ломать основной процесс
        }
    }

    async createEventByReminder(reminder: Reminder | null | undefined): Promise<void> {
        try {
            if (!reminder || !await this.syncAllowed()) {
                return;
            }
            
            if (reminder.googleSync === 0){
                return;
            }
            
            const event = await this.createEvent(
                reminder.title,
                reminder.desc || '',
                reminder.datetime
            );

            if (event?.id) {
                await this.reminderService.saveReminder(reminder.id!, {
                    googleSync: 1,
                    googleEventId: event.id,
                    googleSyncDate: new Date(event.updated!)
                }, false);
            }
        } catch (error) {
            console.error('Error creating event from reminder:', error);
            // Не пробрасываем ошибку дальше
        }
    }

    async deleteEvent(eventId?: string): Promise<void> {
        if (!eventId || !await this.syncAllowed()) return;

        try {
            await this.axiosInstance.delete(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            );
        } catch (error) {
            console.log('Error deleting event:', error);
        }
    }


    async syncUpdates(): Promise<void> {
        console.log(`syncUpdates checking`);

        try {
            if (! await this.syncAllowed() || ! await this.checkUser()) {
                return
            }
            
            console.log('syncUpdates running...');

            const events = await this.getEvents();

            const creating: Reminder[] = [];
            const updating: Reminder[] = [];
            const deletingEvents: CalendarEvent["id"][] = [];

            // Обрабатываем напоминания без блокировки
            await Promise.resolve().then(() => {
                this.reminderService.repository.state.active.forEach((reminderItem: Reminder) => {
                    const event = reminderItem.googleEventId
                        ? events.find(ev => ev.id === reminderItem.googleEventId)
                        : null;

                    if (reminderItem.googleSync !== 0) {
                        if (event && reminderItem.googleSyncDate) {
                            const googleUpdatedAt = new Date(event.updated!);

                            if (event.status === 'cancelled') {
                                this.reminderService.saveReminder(reminderItem.id!, {
                                    googleSync: 0,
                                    googleSyncDate: googleUpdatedAt
                                }, false).catch(console.error);
                            } else if (googleUpdatedAt > reminderItem.googleSyncDate) {
                                this.reminderService.saveReminder(reminderItem.id!, {
                                    datetime: new Date(event.start?.dateTime!),
                                    title: event.summary!,
                                    desc: event.description!,
                                    googleSyncDate: googleUpdatedAt
                                }, false).catch(console.error);
                            } else if (googleUpdatedAt < reminderItem.googleSyncDate) {
                                updating.push(reminderItem);
                            }
                        } else if (reminderItem.datetime.getTime() > Date.now()) {
                            creating.push(reminderItem);
                        }
                    } else if (event) {
                        deletingEvents.push(reminderItem.googleEventId!);
                    }
                });
            });

            for (let reminderItem of creating){
                await this.createEventByReminder(reminderItem)
            }

            for (let reminderItem of updating){
                await this.createEventByReminder(reminderItem)
            }

            for (let eventId of deletingEvents){
                await this.deleteEvent(eventId!)
            }

            await this.googleLastSyncTsStore.setValue(Date.now());
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    
    async fetchToken(interactive = false): Promise<string | null | undefined> {
        if (!this.currentUser && !interactive) return null;

        return new Promise((resolve) => {
            browser.identity.getAuthToken({
                interactive,
                account: { id: this.currentUser!.id }
            }, (token: any) => {

                if (browser.runtime.lastError) {
                    console.error('Auth error:', browser.runtime.lastError);
                    resolve(null);
                } else {
                    resolve(token || null);
                }
            });
        });
    }

    async fetchUserInfo(): Promise<GoogleUser | null> {
        try {
            const response = await this.axiosInstance.get('https://www.googleapis.com/oauth2/v2/userinfo')

            return {
                email: response.data.email,
                name: response.data.name,
                id: response.data.id
            };
        } catch (error) {
            console.error('Ошибка получения информации о пользователе:', error);
            return null;
        }
    }
    
    async checkUser(){
        if (!this.currentUser){
            await this.googleIsAuthenticatedStore.setValue(false);

            return false;
        }

        this.lastActiveToken ??= await this.fetchToken(false); //для страховки
        const tokenUser = await this.fetchUserInfo();
        const isSuccess = tokenUser?.email === this.currentUser.email;
        
        await this.googleIsAuthenticatedStore.setValue(isSuccess);

        return isSuccess;
    }

    async syncAllowed(){
        const syncAllow = await this.allowGoogleSyncStore.getValue();
        
        if (!syncAllow || !this.currentUser) {
            return false;
        }
        
        return true;
    }

    async importFromGoogle(){
        if (! await this.syncAllowed() || ! await this.checkUser()) {
            return
        }
      
        const events = (await this.getEvents())
            .filter(event => event.status !== 'cancelled' && event.start?.dateTime);
        
        for (const event of events) {
            const isExist = (await ReminderService.instance().getAllGoogleEventsIds()).includes(event.id!)
            const datetime = new Date(event.start?.dateTime as string);
            
            if (!isExist && datetime.getTime() >= Date.now()) {
                await this.reminderService.saveReminder({
                    datetime: new Date(event.start?.dateTime as string),
                    title: event.summary!,
                    desc: event.description,
                    googleSyncDate: new Date(event.updated!),
                    googleEventId: event.id,
                }, false)
            }
        }
        
        return true;
    }
}