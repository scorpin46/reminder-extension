import {browser} from "wxt/browser";
import {
    getBroadcastErrorStore,
    getStoredGoogleAuthAlertId, 
    getStoredGoogleCalendarId,
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
// type EventList = calendar_v3.Schema$Events;
// type EventsRequest = calendar_v3.Params$Resource$Events$List;

export class GoogleCalendarService {
    static #instance: GoogleCalendarService;

    readonly #requestTimeout: number = 10000;
    readonly #appNameForCalendar: string = 'set-a-reminder-ext';
    readonly #defaultEndTimeAppendMs: number = 1000;

    readonly #googleUserStore: ReturnType<typeof getStoredGoogleUser>;
    readonly #googleLastSyncTsStore: ReturnType<typeof getStoredGoogleLastSyncTs>;
    readonly #googleIsAuthenticatedStore: ReturnType<typeof getStoredGoogleIsAuthenticated>;
    readonly #googleAuthAlertIdStore: ReturnType<typeof getStoredGoogleAuthAlertId>;
    readonly #googleCalendarIdStore: ReturnType<typeof getStoredGoogleCalendarId>;
    readonly #broadcastErrorStore: ReturnType<typeof getBroadcastErrorStore>;

    #abortController: AbortController | null = null;
    #lastActiveToken?: string | null;
    #axiosInstance: AxiosInstance;
    #isRefreshingToken = false; // Флаг для предотвращения множественных запросов на обновление

    #reminderService: ReminderService;
    currentUser?: GoogleUser | null = null;
    #calendarId?: string | null = null; //не обращаться напрямую! или иначе придется делать instance асинхронным или не кешировать store

    static syncAlarmName?: string = 'syncUpdates';

    private constructor() {
        this.#googleUserStore = getStoredGoogleUser();
        this.#googleLastSyncTsStore = getStoredGoogleLastSyncTs();
        this.#googleIsAuthenticatedStore = getStoredGoogleIsAuthenticated();
        this.#googleAuthAlertIdStore = getStoredGoogleAuthAlertId();
        this.#googleCalendarIdStore = getStoredGoogleCalendarId();
        this.#broadcastErrorStore = getBroadcastErrorStore();

        this.#reminderService = ReminderService.instance();
        this.#abortController = new AbortController();

        this.#googleUserStore.getValue().then(result => {
            this.currentUser = result;
        });

        this.#googleUserStore.watch((newValue, oldValue) => {
            this.currentUser = newValue;
        });

        this.#googleCalendarIdStore.getValue().then(result => {
            this.#calendarId = result;
        });
        
        this.#googleCalendarIdStore.watch((newValue, oldValue) => {
            this.#calendarId = newValue;
        });

        this.#googleIsAuthenticatedStore.watch(async (newValue, oldValue) => {
            const user = await this.#googleUserStore.getValue();

            if (!newValue) {
                this.#lastActiveToken = undefined;
            }

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
        if (!GoogleCalendarService.#instance){
            GoogleCalendarService.#instance = new GoogleCalendarService();
        }
        
        return GoogleCalendarService.#instance;
    }

    private get timeZone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    #isConnectionError = (error: any) => {
        return error && (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.message?.includes('timeout'));
    }
    
    async #getCalendarId(){
        return this.#calendarId ??= await this.#googleCalendarIdStore.getValue();
    }

    // Обработка ошибок axios
    async #handleAxiosError(error: AxiosError): Promise<void> {
        const config = error.config as ExtendedAxiosRequestConfig;

        if (!this.currentUser) {
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
        if (forceSync) {
            setTimeout(() => {
                this.#syncUpdates();
            }, 1000)
        }
    }

    async login(forceNewAccount: boolean = false): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            // if (forceNewAccount) {
            //     return this.#forceAccountSelection();
            // }
            
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

            // Сохраняем оба идентификатора
            const user: GoogleUser = {
                email: userInfoRes.user.email,
                name: userInfoRes.user.name,
                id: userInfoRes.user.id,
            };

            await this.#googleUserStore.setValue(user);
            await this.#googleIsAuthenticatedStore.setValue(true);

            this.#createCalendar();

            console.log(`✅ Аккаунт закреплен: ${user.email} (Chrome ID: ${user.id})`);
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

            await this.#deleteCalendar();

            // Очищаем токены
            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });

            await this.#googleUserStore.removeValue();
            await this.#googleIsAuthenticatedStore.setValue(false);

            this.#isRefreshingToken = false;

            console.log('👋 Выход выполнен');

            return {success: true};
        } catch (e) {
            console.error('Error during logout:', e);
            return {success: false};
        }
    }

    async #deleteCalendar() {
        const calendarId = await this.#getCalendarId();
        
        try {
            if (calendarId === 'primary'){
                //todo но это будет долго выполняться если много событий и успешное логаует сообщение затянется на неопределенный срок, а асинхронно нельзя тк токены слетят
                // один из вариантов сюда callback прокидывать извне с изменением токенов в нем, а снаруже проверять primary или нет или найти другой способ
                const events = await this.#getEvents();
                for (let event of events) {
                    await this.deleteEvent(event.id!);
                }
                return;
            } else if (!calendarId){
                return;
            }
            
            await this.#axiosInstance.delete(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`
            );
            await this.#googleCalendarIdStore.removeValue();
        } catch (error) {
            console.error('Ошибка при удалении календаря:', error);
            throw error;
        }
    }

    async #createCalendar() {
        try {
            // 1. Получаем ID календаря (один запрос)
            let calendarId = await this.#getCalendarId();

            // 2. Проверяем существование календаря
            if (calendarId) {
                try {
                    // Проверяем существование и обновляем настройки за один запрос
                    await this.#axiosInstance.patch(
                        `https://www.googleapis.com/calendar/v3/users/me/calendarList/${calendarId}`,
                        { selected: true, hidden: false }
                    );
                    console.log('Календарь уже существует:', calendarId);

                    return true;
                } catch (error: any) {
                    // Если календарь не найден (404), создаем новый
                    if (error.response?.status === 404) {
                        calendarId = undefined;
                    } else if (error.response?.status !== 409) {
                        calendarId = 'primary'; //todo чисто на всякий случай, хотя конечно лучше повторно пытаться создать
                        console.error(error);
                    }
                }
            }

            if (calendarId){
                await this.#googleCalendarIdStore.setValue(calendarId); //обязательно перед импортом
                this.importFromGoogle();
            } else {
                // 3. Создаем новый календарь (один запрос вместо двух)
                const response = await this.#axiosInstance.post(
                    'https://www.googleapis.com/calendar/v3/calendars',
                    {
                        summary: 'Set a Reminder | Chrome Extension',
                        timeZone: this.timeZone,
                        colorId: 5,
                    },
                    {
                        timeout: 15000,
                    }
                );
                calendarId = response.data.id;
                console.log('Создан новый календарь:', calendarId);
                await this.#googleCalendarIdStore.setValue(calendarId);
            }

            // 4. Отображаем календарь (второй запрос)
            await this.#axiosInstance.patch(
                `https://www.googleapis.com/calendar/v3/users/me/calendarList/${calendarId}`,
                { selected: true, hidden: false }
            );
            
            return true;
        } catch (error) {
            console.error('Ошибка при создании календаря:', error);
            return false;
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

        const calendarId = await this.#getCalendarId();
        
        const response = await this.#axiosInstance.get(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
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

            const calendarId = await this.#getCalendarId();

            const response = await this.#axiosInstance.post(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
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

            const calendarId = await this.#getCalendarId();

            const response = await this.#axiosInstance.put(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
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
            const calendarId = await this.#getCalendarId();

            await this.#axiosInstance.delete(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
            );
        } catch (error) {
            console.log('Error deleting event:', error);
        }
    }

    async #syncUpdates(): Promise<void> {
        console.log(`${new Date()}: syncUpdates checking`);

        if (!await this.checkUser() || ! await this.#getCalendarId()) {
            return;
        }

        try {
            console.log(`syncUpdates running...`);

            const events = await this.#getEvents();
            console.log(events);

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

        if (interactive) {
            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });
        }

        if (this.currentUser?.id) {
            // Если есть сохраненный аккаунт - всегда запрашиваем токен для НЕГО
            params.account = {id: this.currentUser!.id};
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

    async #forceAccountSelection(): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            // Очищаем всё
            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });

            // Получаем client_id из манифеста
            const manifest = browser.runtime.getManifest();
            const clientId = (manifest as any).oauth2?.client_id;

            if (!clientId) {
                throw new Error('OAuth2 client_id not found in manifest');
            }

            // Формируем URL с prompt=select_account для принудительного выбора
            const redirectUri = browser.identity.getRedirectURL();
            const scopes = (manifest as any).oauth2?.scopes || ['https://www.googleapis.com/auth/calendar'];

            const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
            authUrl.searchParams.set('client_id', clientId);
            authUrl.searchParams.set('response_type', 'token');
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('scope', scopes.join(' '));
            authUrl.searchParams.set('prompt', 'select_account'); // КЛЮЧЕВОЙ ПАРАМЕТР!

            console.log('Launching web auth flow with account selection prompt');

            // Используем launchWebAuthFlow вместо getAuthToken
            const responseUrl = await new Promise<string>((resolve, reject) => {
                browser.identity.launchWebAuthFlow({
                    url: authUrl.toString(),
                    interactive: true
                }, (responseUrl) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(responseUrl!);
                    }
                });
            });

            // Извлекаем токен из responseUrl (он в хеше #access_token=...)
            const hash = new URL(responseUrl).hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');

            if (!accessToken) {
                throw new Error('No access token in response');
            }

            this.#lastActiveToken = accessToken;

            // Получаем информацию о пользователе
            const userInfoRes = await this.#fetchUserInfo();
            if (!userInfoRes.user.email) {
                throw new Error(userInfoRes.error || 'Failed to get user info');
            }

            // Сохраняем пользователя
            const user: GoogleUser = {
                email: userInfoRes.user.email,
                name: userInfoRes.user.name,
                id: userInfoRes.user.id,
            };

            this.currentUser = user;
            await this.#googleUserStore.setValue(user);
            await this.#googleIsAuthenticatedStore.setValue(true);

            console.log(`✅ Аккаунт закреплен: ${user.email}`);
            await this.run(true);

            return {success: true, user};
        } catch (error: any) {
            console.error('Ошибка принудительного выбора аккаунта:', error);
            return {success: false, error: error.message};
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