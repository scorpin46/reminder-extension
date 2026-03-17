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
import axios, {AxiosInstance, AxiosError} from 'axios';
import rateLimit from 'axios-rate-limit';
import {delay} from "./utils/helpers";

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
        })
        this.#googleUserStore.watch((newValue, oldValue) => {
            this.currentUser = newValue;
        })

        this.#googleIsAuthenticatedStore.watch(async (newValue, oldValue) => {
            const user = await this.#googleUserStore.getValue();

            if (oldValue && !newValue && user) {
                //todo вот здесь или до этого как-то отрепетировать мб сделать тайм аут или выключить (от ложных срабатываний)
                const notificationId = await browser.notifications.create({
                    type: "basic",
                    iconUrl: browser.runtime.getURL("/icon/128.png"),
                    title: "🔔 " + browser.i18n.getMessage('appName'),  //todo подойдет ли название (учитывая другие языки и глагольную подачу), может вообще тут не писать ничего? по иконке вроде и так понятно(также и обычных)
                    message: browser.i18n.getMessage('syncFailed', [user.email]),
                    requireInteraction: true,
                    buttons: [{title: browser.i18n.getMessage('signIn')}],
                });

                await this.#googleAuthAlertIdStore.setValue(notificationId);
            } else if (newValue) {
                await this.#googleAuthAlertIdStore.removeValue();
            }
        })

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
        this.#axiosInstance.interceptors.request.use(async (config) => {
            if (!this.currentUser) {
                return config;
            }

            this.#lastActiveToken ??= await this.#fetchToken(false);

            if (this.#lastActiveToken) {
                config.headers.Authorization = `Bearer ${this.#lastActiveToken}`;
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
    async #handleAxiosError(error: AxiosError): Promise<never> {
        if (this.#isConnectionError(error)) {
            await this.#broadcastErrorStore.setValue(browser.i18n.getMessage("errorWrongGoogleCalendarConnection"));

            throw new Error(error.message);
        }

        if (error.response) {
            // Сервер ответил с ошибкой
            const status = error.response.status;
            const data = error.response.data as any;

            if (status === 401) {
                //запрос нового токена (но повторного запроса инициировано не будет)
                await this.#fetchToken(false).then(token => {
                    this.#lastActiveToken = token;
                })
            } else if (status === 429) {
                console.error('⚠️ Превышен лимит запросов');
                throw new Error('Rate limit exceeded');
            }

            throw new Error(`API Error ${status}: ${data?.error?.message || 'Unknown error'}`);
        }

        throw error;
    }

    async run(periodMin: number|null = 1): Promise<void> {
        if (periodMin){
            browser.alarms.create(GoogleCalendarService.syncAlarmName, {
                periodInMinutes: periodMin,
            });
        } else {
            this.#syncUpdates();
        }
    }

    async login(): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            this.#lastActiveToken = await this.#fetchToken(true);

            const userInfoRes = await this.#fetchUserInfo();

            if (!userInfoRes.user.email) {
                throw new Error(userInfoRes.error || 'Failed to get user info');
            }

            await this.#googleUserStore.setValue(userInfoRes.user);
            await this.#googleIsAuthenticatedStore.setValue(true);

            console.log(`✅ Аккаунт закреплен: ${userInfoRes.user.email}`);
            await this.run();

            return {success: true, user: userInfoRes.user};
        } catch (error: any) {
            console.error('Ошибка входа:', error);

            let errorMessage = error.message;
            if (this.#isConnectionError(error)) {
                errorMessage = browser.i18n.getMessage('errorNetwork');
            } else if (error.message.toLocaleLowerCase().includes('auth')) {
                errorMessage = browser.i18n.getMessage('errorAuth');
            }

            return {success: false, error: errorMessage};
        } 
    }

    async logout(): Promise<{ success: boolean }> {
        try {
            this.#abortController?.abort();
            this.#abortController = new AbortController();
            browser.alarms.clear(GoogleCalendarService.syncAlarmName);
            await this.#googleUserStore.removeValue();

            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });

        } catch (e) {
            console.error('Error during logout:', e);
        }

        this.#lastActiveToken = undefined;

        console.log('👋 Выход выполнен');

        return {success: true};
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
        )

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
            )

            return response.data;
        } catch (e) {
            console.error(e);
        }

        return null;
    }

    async #updateEvent(eventId: string, summary: string, description: string, startTime: Date): Promise<CalendarEvent | null | undefined> {
        try {
            if (!eventId) return

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
            )

            return response.data;
        } catch (error) {
            console.error('Error updating event:', error);
            return null;
        }
    }

    #prepareEventDescription(reminder: Reminder): string {
        let description = reminder.desc || '';

        if (reminder.url) {
            description += `\n\n[${reminder.url}]`
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
        }
    }

    async updateEventByReminder(reminder: Reminder | null | undefined): Promise<void> {
        if (!reminder) {
            return;
        }

        if (reminder.googleSync === 0 || !reminder.googleEventId) return;

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
            if (!reminder || reminder.googleSync === 0) {
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
        if (!eventId) return;

        try {
            await this.#axiosInstance.delete(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            );
        } catch (error) {
            console.log('Error deleting event:', error);
        }
    }


    async #syncUpdates(): Promise<void> {
        console.log(`${new Date()}: : syncUpdates checking`);
        
        if (!await this.checkUser()) {
            return
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
                await this.createEventByReminder(reminderItem)
            }

            for (let reminderItem of updating) {
                await this.updateEventByReminder(reminderItem)
            }

            for (let eventId of deletingEvents) {
                await this.deleteEvent(eventId!)
            }

            await this.#googleLastSyncTsStore.setValue(Date.now());
        } catch (error) {
            console.error('Sync error:', error);
        }
    }


    async #fetchToken(interactive = false): Promise<string | null | undefined> {
        if (!this.currentUser && !interactive) return null;

        return new Promise((resolve) => {
            browser.identity.getAuthToken({
                interactive,
                account: {id: this.currentUser!.id}
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

    async #fetchUserInfo() {
        try {
            const response = await this.#axiosInstance.get('https://www.googleapis.com/oauth2/v2/userinfo')

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
            }
        }
    }

    async checkUser() {
        try {
            if (!this.currentUser) {
                await this.#googleIsAuthenticatedStore.setValue(false);

                return false;
            }

            this.#lastActiveToken ??= await this.#fetchToken(false); //для страховки
            let userInfoRes = await this.#fetchUserInfo();

            if (userInfoRes.error && this.#isConnectionError(userInfoRes.error)) {
                return false;
            }
            
            if (userInfoRes.error && userInfoRes.error.status === 401) {
                this.#lastActiveToken = await this.#fetchToken(false);
                userInfoRes = await this.#fetchUserInfo(); //контрольная проверка
            }
            
            const isSuccess = userInfoRes.user.email === this.currentUser.email;
            await this.#googleIsAuthenticatedStore.setValue(isSuccess);

            return isSuccess;
        } catch (error: any) {
            console.error(error);
        }

        return false;
    }

    async importFromGoogle() {
        if (!await this.checkUser()) {
            return
        }

        const events = (await this.#getEvents())
            .filter(event => event.status !== 'cancelled' && event.start?.dateTime);

        for (const event of events) {
            const isExist = (await ReminderService.instance().getAllGoogleEventsIds()).includes(event.id!)
            const datetime = new Date(event.start?.dateTime as string);

            if (!isExist && datetime.getTime() >= Date.now()) {
                await this.#reminderService.save({
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