import {browser} from "wxt/browser";
import {getStoredGoogleUser, GoogleUser} from "./utils/storage";
import {ReminderService} from "@/modules/reminderService";
import type {Reminder, ReminderState} from "@/modules/repositories/reminderRepository";
import type {calendar_v3} from "@googleapis/calendar";
import {processInBatches} from "./utils/helpers";
// import ManifestBase = Browser.runtime.ManifestBase;

type CalendarEvent = calendar_v3.Schema$Event;
type EventList = calendar_v3.Schema$Events;
type EventsRequest = calendar_v3.Params$Resource$Events$List;

export class GoogleCalendarService {
    private currentUser: GoogleUser | null = null;
    private pollInterval?: number | null;
    private readonly checkInterval: number = 60 * 1000;
    private readonly appNameForCalendar: string = 'set-a-reminder-ext';
    private notificationShown: boolean = false; // чтобы не спамить уведомлениями
    private googleUserStore: ReturnType<typeof getStoredGoogleUser>;
    private reminderService: ReminderService;
    private lastActiveToken?: string;
    private readonly defaultEndTimeAppendMinutes: number = 10;

    constructor(reminderService: ReminderService) {
        this.googleUserStore = getStoredGoogleUser();
        this.reminderService = reminderService;
    }

    private get timeZone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    async run(): Promise<void> {
        console.log('run');
        try {
            const data = await this.googleUserStore.getValue();
            this.currentUser = data || null;
            if (this.currentUser) {
                console.log('👤 Сессия восстановлена для:', this.currentUser.email);
                this.startPolling();
            }
        } catch (e) {
            console.log('Нет сохраненной сессии');
        }
    }

    // Получение токена ТОЛЬКО для сохраненного пользователя
    private async getTokenForSavedUser(interactive = false): Promise<string | null> {
        if (!this.currentUser) return null;

        return new Promise((resolve) => {
            // Явно указываем ID сохраненного пользователя
            browser.identity.getAuthToken({
                interactive,
                account: {
                    id: this.currentUser!.id
                },
                // scopes: this.manifest.oauth2?.scopes,
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

    // Получение информации о пользователе из Google
    private async getUserInfoByToken(token: string): Promise<GoogleUser | null> {
        try {
            const response = await fetch(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                {headers: {'Authorization': `Bearer ${token}`}}
            );

            if (!response.ok) return null;

            const data = await response.json();
            return {
                email: data.email,
                name: data.name,
                id: data.id
            };
        } catch (error) {
            console.error('Ошибка получения информации о пользователе:', error);
            return null;
        }
    }

    // Проверка статуса сохраненного пользователя
    private async checkSavedUserStatus(): Promise<'active' | 'logged_out' | 'switched'> {
        if (!this.currentUser) return 'logged_out';

        try {
            // Пытаемся получить токен для сохраненного пользователя
            const token = await this.getTokenForSavedUser(false);

            if (!token) {
                // Не удалось получить токен - пользователь вышел
                return 'logged_out';
            }

            // Проверяем, что токен действительно принадлежит сохраненному пользователю
            const tokenUser = await this.getUserInfoByToken(token);

            if (tokenUser?.email !== this.currentUser.email) {
                // Токен принадлежит другому пользователю - переключились на другой аккаунт
                return 'switched';
            }

            this.lastActiveToken = token;

            // Все хорошо - сохраненный пользователь активен
            return 'active';

        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            return 'logged_out';
        }
    }

    // todo как и что отобраджать?
    private async showNotification(message: string) {
        if (this.notificationShown) return; // не спамим

        this.notificationShown = true;

        // Сбрасываем флаг через 5 минут
        setTimeout(() => {
            this.notificationShown = false;
        }, 5 * 60 * 1000);

        // Показываем уведомление
        await browser.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Google Календарь',
            message: message,
            priority: 2
        });
    }


    // Запуск периодической проверки
    startPolling(): void {
        if (this.pollInterval) return;

        this.checkForUpdates();

        this.pollInterval = setInterval(() => {
            this.checkForUpdates();
        }, this.checkInterval) as unknown as number;
    }

    // Остановка
    stopPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    // Вход
    async login(): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            // Получаем токен (интерактивно)
            const token = await new Promise<string>((resolve, reject) => {
                browser.identity.getAuthToken({interactive: true}, (token: any) => {
                    if (browser.runtime.lastError) {
                        reject(browser.runtime.lastError);
                    } else {
                        resolve(token!);
                    }
                });
            });

            // Получаем информацию о пользователе
            const userInfo = await this.getUserInfoByToken(token);
            if (!userInfo) {
                throw new Error('Failed to get user info');
            }

            // Сохраняем пользователя
            this.currentUser = userInfo;
            await this.googleUserStore.setValue(userInfo);

            console.log(`✅ Аккаунт закреплен: ${userInfo.email}`);
            this.startPolling();

            return {success: true, user: userInfo};
        } catch (error: any) {
            console.error('Ошибка входа:', error);
            return {success: false, error: error.message};
        }
    }

    // Выход
    async logout(): Promise<{ success: boolean }> {
        this.stopPolling();

        try {
            // Очищаем все кэшированные токены
            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });
        } catch (e) {
            console.error('Error during logout:', e);
        }

        // Очищаем данные
        this.currentUser = null;
        this.notificationShown = false;
        await this.googleUserStore.removeValue()

        console.log('👋 Выход выполнен');
        return {success: true};
    }

    // Проверка статуса (вызывается из popup)
    async checkStatus(): Promise<{
        authenticated: boolean;
        user: GoogleUser | null;
        status: 'active' | 'logged_out' | 'switched';
    }> {
        if (!this.currentUser) {
            return {authenticated: false, user: null, status: 'logged_out'};
        }

        const userStatus = await this.checkSavedUserStatus();

        // Если пользователь вышел - показываем уведомление
        if (userStatus === 'logged_out') {
            await this.showNotification(
                `Аккаунт ${this.currentUser.email} вышел из Chrome. Войдите в этот аккаунт для продолжения синхронизации.`
            );
        }

        return {
            authenticated: userStatus === 'active',
            user: this.currentUser,
            status: userStatus
        };
    }

    // Получение событий (всегда с сохраненным пользователем)
    async getEvents(maxResults: number = 2500): Promise<CalendarEvent[]> {
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }

        // Проверяем статус перед запросом
        const status = await this.checkSavedUserStatus();

        if (status === 'logged_out') {
            await this.showNotification(
                `Аккаунт ${this.currentUser.email} вышел из Chrome. Синхронизация приостановлена.`
            );
            throw new Error('User logged out');
        }

        if (status === 'switched') {
            // При переключении профиля - продолжаем работать со старым
            console.log('⚠️ Профиль Chrome переключен, но работаем с:', this.currentUser.email);
        }

        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);
        if (!token) {
            throw new Error('Failed to get token');
        }

        let pageToken = null;
        let allEvents: any[] = [];

        // do {
        const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');

        let requestParams: EventsRequest = {
            maxResults: maxResults,
            timeZone: this.timeZone,
            orderBy: 'startTime',
            singleEvents: true,
            showDeleted: true,
            // timeMin: new Date(Date.now() - 60 * 4 * 1000).toISOString(),
            privateExtendedProperty: [`appName=${this.appNameForCalendar}`]
        }
        
        //todo пока не используется (вряд ли понадобится, запрос то 1)
        if (pageToken){
            requestParams.pageToken = pageToken;
        }
        
        // @ts-ignore
        const params = new URLSearchParams(requestParams);

        // Применяем параметры к URL
        url.search = params.toString();

        const response = await fetch(url.toString(),
            {headers: {'Authorization': `Bearer ${token}`}}
        );

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}: ${await response.text()}`);
        }

        const data: EventList = await response.json();

        // Добавляем события с текущей страницы
        if (data.items?.length) {
            allEvents = allEvents.concat(data.items);
        }

        // Получаем токен для следующей страницы
        pageToken = data.nextPageToken;

        // Небольшая задержка между страницами для соблюдения лимитов
        if (pageToken) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // } while (pageToken);

        return allEvents;
    }

    async createEvent(summary: string, description: string, startTime: Date, endTime?: Date): Promise<CalendarEvent> {
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }

        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);
        if (!token) {
            throw new Error('Failed to get token');
        }

        endTime ??= new Date(startTime.getTime() + this.defaultEndTimeAppendMinutes * 60 * 1000);

        //todo Добавить цвет отдельный для напоминаний приложения
        let event: CalendarEvent = {
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
            // endTimeUnspecified: true,
            transparency: 'transparent',
            visibility: 'private',
            extendedProperties: {
                private: {
                    appName: this.appNameForCalendar,
                }
            },
            //todo чекать глобальный флаг "выключить уведомления гугл" и 
            reminders: {
                useDefault: false,  // Отключаем стандартные напоминания
                overrides: [
                    {
                        method: 'popup',     // Всплывающее уведомление
                        minutes: 0            // 0 минут = в момент начала события
                    }
                ]
            },
        };

        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            }
        );

        if (!response.ok) {

            const error = await response.json();
            console.error('Ошибка добавления напоминания в google', error)
            throw new Error(`Ошибка ${response.status}: ${error.error?.message || 'Неизвестная ошибка'}`);
        }

        return response.json();
    }

    async updateEvent(eventId: string, summary: string, description: string, startTime: Date, endTime?: Date): Promise<CalendarEvent> {
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }

        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);
        if (!token) {
            throw new Error('Failed to get token');
        }

        endTime ??= new Date(startTime.getTime() + this.defaultEndTimeAppendMinutes * 60 * 1000);

        let event: CalendarEvent = {
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

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            }
        );

        if (!response.ok) {

            const error = await response.json();
            console.error('Ошибка добавления напоминания в google', error)
            throw new Error(`Ошибка ${response.status}: ${error.error?.message || 'Неизвестная ошибка'}`);
        }

        return response.json();
    }

    async getEventById(eventId: string) {
        const calendarId = 'primary';
        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.json();
    }

    async deleteEvent(eventId: string) {
        const calendarId = 'primary'; // или конкретный ID календаря
        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
            {
                method: 'DELETE', // Важно: используем DELETE, а не GET или POST
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Ошибка ${response.status}: ${error.error?.message || 'Неизвестная ошибка'}`);
        }

        // При успешном удалении API возвращает пустой ответ с кодом 204
        console.log(`Событие ${eventId} успешно удалено`);

        return true;
    }

    async createEventByReminder(reminder: Reminder){
        return this.createEvent(reminder.title, reminder.desc || '', reminder.datetime)
            .then((event: CalendarEvent) => {
                this.reminderService.saveReminder(reminder.id!, {
                    googleSync: 1,
                    googleEventId: event.id!,
                    googleSyncDate: new Date(event.updated!),
                })
            })    
    }
    
    async updateEventByReminder(reminder: Reminder){
        if (reminder.googleSync === 0) {
            return;
        }
        
        return this.updateEvent(reminder.googleEventId!, reminder.title, reminder.desc || '', reminder.datetime)
            .then((event: CalendarEvent) => {
                this.reminderService.saveReminder(reminder.id!, {
                    googleSyncDate: new Date(event.updated!),
                })
            })
    }
    
    // Проверка обновлений
    private async checkForUpdates(): Promise<void> {
        if (!this.currentUser) return;

        try {
            const status = await this.checkSavedUserStatus();

            if (status === 'logged_out') {
                await this.showNotification(
                    `Аккаунт ${this.currentUser.email} вышел из Chrome. Синхронизация приостановлена.`
                );
                return;
            }
            // Даже если switched - продолжаем синхронизацию со старым аккаунтом
            
            const events = await this.getEvents();
            
            let creating: Reminder[] = [];
            let updating: Reminder[] = [];
            let deletingEvents: CalendarEvent["id"][] = [];
            
            this.reminderService.repository.state.active.forEach((reminderItem: Reminder) => {
                const event = reminderItem.googleEventId
                    ? events.find((ev) => ev.id === reminderItem.googleEventId)
                    : null;

                //todo нужно еще глобальный флаг сделать и при подключении разрешить синхронизацию? или автоматом
                if (reminderItem.googleSync !== 0) {
                    if (event && reminderItem.googleSyncDate) {
                        const googleUpdatedAt = new Date(event.updated!);
                        const syncOff = event.status === 'cancelled';
                        
                        if (syncOff){
                            this.reminderService.saveReminder(reminderItem.id!, {
                                googleSync: 0,
                                googleSyncDate: googleUpdatedAt,
                            })
                        } else if (googleUpdatedAt > reminderItem.googleSyncDate){
                            this.reminderService.saveReminder(reminderItem.id!, {
                                datetime: new Date(event.start?.dateTime!),
                                title: event.summary!,
                                desc: event.description!,
                                googleSyncDate: googleUpdatedAt,
                            })
                        } else if (googleUpdatedAt < reminderItem.googleSyncDate){
                            updating.push(reminderItem);
                        }
                    } else if (reminderItem.datetime.getTime() > Date.now()) { //если напоминание в будущем
                        creating.push(reminderItem)
                    }
                } else if (event) {
                    deletingEvents.push(reminderItem.googleEventId!)
                }
            })

            await processInBatches(creating, async (reminderItem: Reminder) => {
                return this.createEventByReminder(reminderItem)
            }, 8)
            
            await processInBatches(updating, async (reminderItem: Reminder) => {
                return this.updateEventByReminder(reminderItem)
            }, 8)

            await processInBatches(deletingEvents, async (eventId) => {
                return this.deleteEvent(eventId!)
            }, 8)
            
        } catch (error) {
            console.error('Sync error:', error);
        }
    }


    initBackground() {
        browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.action) {
                case 'googleLogin':
                    this.login().then(sendResponse);
                    return true;
                case 'googleLogout':
                    this.logout().then(sendResponse);
                    return true;
                case 'googleCheckStatus':
                    this.checkStatus().then(sendResponse);
                    return true;
                case 'googleCreateEvent':
                    this.createEvent(request.reminder.title, request.reminder.desc || '', request.reminder.datetime)
                        .then(event => sendResponse({success: true, event}))
                        .catch(error => sendResponse({success: false, error: error.message}));
                    return true;
            }
        });

        // При старте
        browser.runtime.onStartup?.addListener(() => {
            this.run();
        });

        // При установке/обновлении
        browser.runtime.onInstalled?.addListener(() => {
            //todo добавить какие-то уведомления?
            this.run();
        });
    }
}