import {browser} from "wxt/browser";
import {
    getBroadcastErrorStore,
    getStoredGoogleAuthAlertIdStore,
    getStoredGoogleIsAuthenticated,
    getStoredGoogleLastSyncTs,
    getStoredGoogleUser,
    GoogleUser
} from "./utils/storage";
import {ReminderService} from "./reminderService";
import type {Reminder} from "./reminderRepository";
import type {calendar_v3} from "@googleapis/calendar";
import axios, {AxiosInstance, AxiosError, InternalAxiosRequestConfig} from 'axios';
import rateLimit from 'axios-rate-limit';
import {delay} from "./utils/helpers";

// Расширяем интерфейс для хранения флага повтора
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

type CalendarEvent = calendar_v3.Schema$Event;
type EventList = calendar_v3.Schema$Events;
type EventsRequest = calendar_v3.Params$Resource$Events$List;

export class GoogleCalendarService {
    static #instance: GoogleCalendarService;

    readonly #requestTimeout: number = 5000;
    readonly #appNameForCalendar: string = 'set-a-reminder-ext';
    readonly #defaultEndTimeAppendMs: number = 1000;

    readonly #googleUserStore: ReturnType<typeof getStoredGoogleUser>;
    readonly #googleLastSyncTsStore: ReturnType<typeof getStoredGoogleLastSyncTs>;
    readonly #googleIsAuthenticatedStore: ReturnType<typeof getStoredGoogleIsAuthenticated>;
    readonly #googleAuthAlertIdStore: ReturnType<typeof getStoredGoogleAuthAlertIdStore>;
    readonly #broadcastErrorStore: ReturnType<typeof getBroadcastErrorStore>;

    #abortController: AbortController | null = null;
    #lastActiveToken?: string | null;
    #axiosInstance: AxiosInstance;
    #isRefreshingToken = false; // Флаг для предотвращения множественных запросов на обновление

    #reminderService: ReminderService;
    currentUser?: GoogleUser | null = null;

    static syncAlarmName?: string = 'syncUpdates';

    private constructor() {
        this.#googleUserStore = getStoredGoogleUser();
        this.#googleLastSyncTsStore = getStoredGoogleLastSyncTs();
        this.#googleIsAuthenticatedStore = getStoredGoogleIsAuthenticated();
        this.#googleAuthAlertIdStore = getStoredGoogleAuthAlertIdStore();
        this.#broadcastErrorStore = getBroadcastErrorStore();

        this.#reminderService = ReminderService.instance();
        this.#abortController = new AbortController();

        this.#googleUserStore.getValue().then(result => {
            this.currentUser = result;
        });

        this.#googleUserStore.watch((newValue, oldValue) => {
            this.currentUser = newValue;
        });

        // Слушаем смену аккаунта в Chrome, но не реагируем на неё
        browser.identity.onSignInChanged?.addListener((account, signedIn) => {
            if (this.currentUser && account.id !== this.currentUser.chromeAccountId) {
                console.log(`Chrome active account changed to ${account.id}, but extension remains synced with ${this.currentUser.email}`);
                // Просто логируем, не разлогиниваемся
            }
        });

        this.#googleIsAuthenticatedStore.watch(async (newValue, oldValue) => {
            const user = await this.#googleUserStore.getValue();

            if (oldValue && !newValue && user) {
                const notificationId = await browser.notifications.create({
                    type: "basic",
                    iconUrl: browser.runtime.getURL("/icon/128.png"),
                    title: "🔔 " + browser.i18n.getMessage('appName'),
                    message: browser.i18n.getMessage('syncFailed', [user.email]),
                    requireInteraction: true,
                    buttons: [{title: browser.i18n.getMessage('signIn')}],
                });

                await this.#googleAuthAlertIdStore.setValue(notificationId);
            } else if (newValue) {
                await this.#googleAuthAlertIdStore.removeValue();
            }
        });

        this.#axiosInstance = rateLimit(
            axios.create({
                timeout: this.#requestTimeout,
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: this.#abortController.signal
            }),
            {
                maxRequests: 5,
                perMilliseconds: 1000
            }
        );

        // Перехватчик для добавления токена
        this.#axiosInstance.interceptors.request.use(async (config: ExtendedAxiosRequestConfig) => {
            if (this.#lastActiveToken) {
                config.headers.Authorization = `Bearer ${this.#lastActiveToken}`;
            }
            
            if (!this.currentUser) {
                return config;
            }

            // Если это не повторный запрос после 401, получаем токен
            if (!config._retry && !this.#lastActiveToken) {
                await this.#fetchToken(false);
            }

            return config;
        });

        // Перехватчик для обработки ошибок
        this.#axiosInstance.interceptors.response.use(
            response => response,
            this.#handleAxiosError.bind(this)
        );
    }

    static instance() {
        return GoogleCalendarService.#instance ??= new GoogleCalendarService();
    }

    private get timeZone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    #isConnectionError = (error: any) => {
        return error && (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.message?.includes('timeout'));
    }

    // Обработка ошибок axios
    async #handleAxiosError(error: AxiosError): Promise<void> {
        const config = error.config as ExtendedAxiosRequestConfig;
        
        if (!this.currentUser){
            console.log('Отсутствует привязанный юзер, пропуск обработки ошибки axios')
            return;
        }

        if (this.#isConnectionError(error)) {
            await this.#broadcastErrorStore.setValue(browser.i18n.getMessage("errorWrongGoogleCalendarConnection"));
            throw new Error(error.message);
        }
        
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as any;

            if (status === 401 && config && !config._retry) {
                // Помечаем запрос как повторный, чтобы избежать цикла
                config._retry = true;

                try {
                    // Пробуем обновить токен
                    if (!this.#isRefreshingToken) {
                        this.#isRefreshingToken = true;

                        // Пробуем получить новый токен
                        await this.#fetchToken(false);

                        if (this.#lastActiveToken) {
                            // Обновляем заголовок авторизации
                            config.headers.Authorization = `Bearer ${this.#lastActiveToken}`;

                            // Повторяем запрос
                            return this.#axiosInstance.request(config);
                        } else {
                            // Не удалось получить токен - пользователь не авторизован
                            await this.#googleIsAuthenticatedStore.setValue(false);
                            throw new Error('Authentication failed');
                        }
                    } else {
                        // Если уже идет обновление токена, ждем немного и пробуем снова
                        await delay(1000);
                        if (this.#lastActiveToken) {
                            config.headers.Authorization = `Bearer ${this.#lastActiveToken}`;
                            return this.#axiosInstance.request(config);
                        }
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    throw new Error('Authentication failed');
                } finally {
                    this.#isRefreshingToken = false;
                }
            } else if (status === 401 && config?._retry) {
                // Если это уже повторный запрос и снова 401 - значит проблемы с авторизацией
                console.error('Repeated 401 error after token refresh');
                await this.#googleIsAuthenticatedStore.setValue(false);
                throw new Error('Authentication failed');
            } else if (status === 429) {
                console.error('⚠️ Rate limit exceeded');
                throw new Error('Rate limit exceeded');
            }

            throw new Error(`API Error ${status}: ${data?.error?.message || 'Unknown error'}`);
        }

        throw error;
    }

    async isAuthenticated(): Promise<boolean> {
        return await this.#googleIsAuthenticatedStore.getValue();
    }
    
    async run(forceSync: boolean = false): Promise<void> {
        browser.alarms.create(GoogleCalendarService.syncAlarmName, {
            periodInMinutes: 1,
        });
        if (forceSync){
            this.#syncUpdates();
        }
    }

    async login(): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            // Сбрасываем флаг обновления токена
            this.#isRefreshingToken = false;

            // Получаем токен интерактивно (пользователь выбирает аккаунт)
            console.log("Запрос интерактивного выбора аккаунта")
            await this.#fetchToken(true);
            console.log("Результат интерактивного выбора аккаунта", this.#lastActiveToken)
           
            if (!this.#lastActiveToken) {
                throw new Error('Failed to get auth token');
            }

            // Получаем информацию о пользователе Google
            const userInfoRes = await this.#fetchUserInfo();
            if (!userInfoRes.user.email) {
                throw new Error(userInfoRes.error || 'Failed to get user info');
            }

            // Получаем Chrome Account ID (стабильный идентификатор)
            const accounts = await new Promise<{id: string, email: string}>((resolve) => {
                browser.identity.getProfileUserInfo(resolve);
            });

            // Сохраняем оба идентификатора
            const user: GoogleUser = {
                email: userInfoRes.user.email,
                name: userInfoRes.user.name,
                id: userInfoRes.user.id,
                chromeAccountId: accounts.id // Ключевой момент для привязки к аккаунту
            };

            await this.#googleUserStore.setValue(user);
            await this.#googleIsAuthenticatedStore.setValue(true);

            console.log(`✅ Аккаунт закреплен: ${user.email} (Chrome ID: ${user.chromeAccountId})`);
            await this.run(true);

            return {success: true, user};
        } catch (error: any) {
            console.error('Ошибка входа:', error);

            let errorMessage = error.message;
            if (this.#isConnectionError(error)) {
                errorMessage = browser.i18n.getMessage('errorNetwork');
            } else if (error.message.toLowerCase().includes('auth')) {
                errorMessage = browser.i18n.getMessage('errorAuth');
            }

            return {success: false, error: errorMessage};
        }
    }

    async logout(): Promise<{ success: boolean }> {
        try {
            browser.alarms.clear(GoogleCalendarService.syncAlarmName);
        
            // Очищаем токены
            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });

            await this.#googleUserStore.removeValue();
            await this.#googleIsAuthenticatedStore.setValue(false);

            this.#lastActiveToken = undefined;
            this.currentUser = null;
            this.#isRefreshingToken = false;

            console.log('👋 Выход выполнен');

            return {success: true};
        } catch (e) {
            console.error('Error during logout:', e);
            return {success: false};
        }
    }

    async #getEvents(maxResults: number = 2500): Promise<CalendarEvent[]> {
        const params = new URLSearchParams({
            maxResults: maxResults.toString(),
            timeZone: this.timeZone,
            orderBy: 'startTime',
            singleEvents: 'true',
            showDeleted: 'true',
            privateExtendedProperty: `appName=${this.#appNameForCalendar}`
        });

        const response = await this.#axiosInstance.get(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        );

        return response.data.items || [];
    }

    async #createEvent(summary: string, description: string, startTime: Date): Promise<CalendarEvent | null | undefined> {
        try {
            let endTime = new Date(startTime.getTime() + this.#defaultEndTimeAppendMs);

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
                        appName: this.#appNameForCalendar
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [{method: 'popup', minutes: 0}]
                }
            };

            const response = await this.#axiosInstance.post(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                event,
            );

            return response.data;
        } catch (e) {
            console.error(e);
        }

        return null;
    }

    async #updateEvent(eventId: string, summary: string, description: string, startTime: Date): Promise<CalendarEvent | null | undefined> {
        try {
            if (!eventId) return;

            let endTime = new Date(startTime.getTime() + this.#defaultEndTimeAppendMs);

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
                transparency: 'transparent',
                visibility: 'private',
                extendedProperties: {
                    private: {
                        appName: this.#appNameForCalendar
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [{method: 'popup', minutes: 0}]
                }
            };

            const response = await this.#axiosInstance.put(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                event,
            );

            return response.data;
        } catch (error) {
            console.error('Error updating event:', error);
            return null;
        }
    }

    #prepareEventDescription(reminder: Reminder): string {
        let description = reminder.desc || '';

        if (reminder.url) {
            description += `\n\n[${reminder.url}]`;
        }

        return description.trim();
    }

    #googleEventToReminderFields(event: CalendarEvent): Partial<Reminder> {
        let description = (event.description || '').trim();
        const matches = description.match(/\[(https?:\/\/.+)]$/i) || [];
        const url = matches[1];

        if (url) {
            description = description.replace(matches[0]!, '');
        }

        return {
            datetime: new Date(event.start?.dateTime!),
            title: event.summary!,
            desc: description,
            url: url,
        };
    }

    async updateEventByReminder(reminder: Reminder | null | undefined): Promise<void> {
        if (!reminder || !this.currentUser || reminder.googleSync === 0 || !reminder.googleEventId) {
            return;
        }

        try {
            const event = await this.#updateEvent(
                reminder.googleEventId,
                reminder.title,
                this.#prepareEventDescription(reminder),
                reminder.datetime
            );

            if (event?.updated) {
                await this.#reminderService.save(reminder.id!, {
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
            if (!reminder || !this.currentUser || reminder.googleSync === 0) {
                return;
            }

            const event = await this.#createEvent(
                reminder.title,
                this.#prepareEventDescription(reminder),
                reminder.datetime
            );

            if (event?.id) {
                await this.#reminderService.save(reminder.id!, {
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
        if (!eventId || !this.currentUser) return;

        try {
            await this.#axiosInstance.delete(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            );
        } catch (error) {
            console.log('Error deleting event:', error);
        }
    }

    async #syncUpdates(): Promise<void> {
        console.log(`${new Date()}: syncUpdates checking`);

        if (!await this.checkUser()) {
            return;
        }

        try {
            console.log(`syncUpdates running...`);

            const events = await this.#getEvents();

            const creating: Reminder[] = [];
            const updating: Reminder[] = [];
            const deletingEvents: CalendarEvent["id"][] = [];

            // Обрабатываем напоминания без блокировки
            await Promise.resolve().then(() => {
                this.#reminderService.repository.state.active.forEach((reminderItem: Reminder) => {
                    const event = reminderItem.googleEventId
                        ? events.find(ev => ev.id === reminderItem.googleEventId)
                        : null;

                    if (reminderItem.googleSync !== 0) {
                        if (event && reminderItem.googleSyncDate) {
                            const googleUpdatedAt = new Date(event.updated!);

                            if (event.status === 'cancelled') {
                                this.#reminderService.save(reminderItem.id!, {
                                    googleSync: 0,
                                    googleSyncDate: googleUpdatedAt
                                }, false).catch(console.error);
                            } else if (googleUpdatedAt > reminderItem.googleSyncDate) {
                                this.#reminderService.save(reminderItem.id!, {
                                    ...this.#googleEventToReminderFields(event),
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

            for (let reminderItem of creating) {
                await this.createEventByReminder(reminderItem);
            }

            for (let reminderItem of updating) {
                await this.updateEventByReminder(reminderItem);
            }

            for (let eventId of deletingEvents) {
                await this.deleteEvent(eventId!);
            }

            await this.#googleLastSyncTsStore.setValue(Date.now());
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    async #fetchToken(interactive = false): Promise<string | null> {
        const params: any = {
            interactive,
        };

        if (this.currentUser?.chromeAccountId) {
            // Если есть сохраненный аккаунт - всегда запрашиваем токен для НЕГО
            params.account = { id: this.currentUser!.chromeAccountId };
        }

        return new Promise((resolve) => {
            browser.identity.getAuthToken(params, (token) => {
                if (browser.runtime.lastError) {
                    console.error('Auth error:', browser.runtime.lastError);
                    this.#lastActiveToken = null;
                    resolve(null);
                } else {
                    this.#lastActiveToken = token as string;
                    resolve(token as string);
                }
            });
        });
    }

    async #fetchUserInfo() {
        try {
            const response = await this.#axiosInstance.get('https://www.googleapis.com/oauth2/v2/userinfo');

            return {
                user: {
                    email: response.data.email,
                    name: response.data.name,
                    id: response.data.id
                },
                error: null
            };
        } catch (error: any) {
            console.error('Ошибка получения информации о пользователе:', error);

            return {
                user: {
                    email: '',
                    name: '',
                    id: '',
                },
                error: error
            };
        }
    }

    async checkUser() {
        try {
            if (!this.currentUser) {
                await this.#googleIsAuthenticatedStore.setValue(false);
                return false;
            }

            // Получаем токен для СОХРАНЕННОГО аккаунта (даже если активный аккаунт сменился)
            await this.#fetchToken(false);
            if (!this.#lastActiveToken) {
                await this.#googleIsAuthenticatedStore.setValue(false);
                return false;
            }

            const userInfoRes = await this.#fetchUserInfo();

            if (userInfoRes.error && this.#isConnectionError(userInfoRes.error)) {
                return false;
            }

            // Если получили 401 ошибку при запросе userinfo
            if (userInfoRes.error?.response?.status === 401) {
                await this.#googleIsAuthenticatedStore.setValue(false);
                return false;
            }

            // Сравниваем по Google ID, а не по email (ID никогда не меняется)
            const isValid = userInfoRes.user.id === this.currentUser.id;
            await this.#googleIsAuthenticatedStore.setValue(isValid);

            return isValid;
        } catch (error: any) {
            console.error('Error checking user:', error);
        }

        return false;
    }

    async importFromGoogle() {
        if (!await this.checkUser()) {
            return;
        }

        const events = (await this.#getEvents())
            .filter(event => event.status !== 'cancelled' && event.start?.dateTime);

        for (const event of events) {
            const isExist = (await ReminderService.instance().getAllGoogleEventsIds()).includes(event.id!);
            const datetime = new Date(event.start?.dateTime as string);

            if (!isExist && datetime.getTime() >= Date.now()) {
                await this.#reminderService.save({
                    datetime: new Date(event.start?.dateTime as string),
                    title: event.summary!,
                    desc: event.description,
                    googleSyncDate: new Date(event.updated!),
                    googleEventId: event.id,
                }, false);
            }
        }

        return true;
    }
}