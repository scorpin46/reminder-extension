import {browser} from "wxt/browser";
import {getStoredGoogleUser, GoogleUser} from "./utils/storage";
import {ReminderService} from "@/modules/reminderService";
import type {Reminder, ReminderState} from "@/modules/repositories/reminderRepository";
import axios, {AxiosInstance, AxiosError} from 'axios';


/**
 * Сервис для работы с Google Calendar API
 * Обеспечивает синхронизацию напоминаний с календарем Google
 * @class GoogleCalendarService
 */
export class GoogleCalendarService {
    private currentUser: GoogleUser | null = null;
    private pollInterval?: number | null;
    private readonly checkInterval: number = 60 * 1000; // 1 минута
    private notificationShown: boolean = false; // чтобы не спамить уведомлениями
    private googleUserStore: ReturnType<typeof getStoredGoogleUser>;
    private reminderService: ReminderService;
    private lastActiveToken?: string;
    private axiosInstance: AxiosInstance;
    private connectionLostNotified: boolean = false; // Флаг для предотвращения спама уведомлений о потере соединения
    private pendingRequests: Map<string, AbortController> = new Map(); // Для отмены запросов

    constructor(reminderService: ReminderService) {
        this.googleUserStore = getStoredGoogleUser();
        this.reminderService = reminderService;

        // Настраиваем axios с таймаутом и перехватчиками
        this.axiosInstance = axios.create({
            timeout: 5000, // 5 секунд таймаут
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Добавляем перехватчик запросов
        this.axiosInstance.interceptors.request.use(
            (config) => {
                // Создаем AbortController для каждого запроса
                const controller = new AbortController();
                config.signal = controller.signal;

                // Сохраняем controller для возможности отмены
                const requestId = `${config.method}-${config.url}-${Date.now()}`;
                this.pendingRequests.set(requestId, controller);

                // Удаляем controller после завершения запроса
                config.metadata = { requestId };

                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Добавляем перехватчик ответов
        this.axiosInstance.interceptors.response.use(
            (response) => {
                console.log(response.config.metadata);
                // Очищаем controller после успешного запроса
                if (response.config.metadata?.requestId) {
                    this.pendingRequests.delete(response.config.metadata.requestId);
                }

                return response;
            },
            (error: AxiosError) => {
                // Очищаем controller после ошибки
                if (error.config?.metadata?.requestId) {
                    this.pendingRequests.delete(error.config.metadata.requestId);
                }

                return this.handleAxiosError(error);
            }
        );

        this.start();
    }

    /**
     * Имя приложения для идентификации в календаре
     * @private
     */
    private get appNameForCalendar(): string {
        return "set-a-reminder-ext";
    }

    /**
     * Часовой пояс пользователя
     * @private
     */
    private get timeZone(): string {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    /**
     * Запуск сервиса при старте
     * @private
     */
    private async start(): Promise<void> {
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

    /**
     * Отправка уведомления об ошибке в Popup
     * @param statusCode - HTTP статус код или специальный код ошибки
     * @param message - описание ошибки
     * @private
     */
    private async notifyError(statusCode: number | string, message: string): Promise<void> {
        // Предотвращаем спам уведомлениями (не чаще 1 раза в 10 секунд)
        if (this.connectionLostNotified) return;

        this.connectionLostNotified = true;

        // Сбрасываем флаг через 10 секунд
        setTimeout(() => {
            this.connectionLostNotified = false;
        }, 10000);

        try {
            await browser.runtime.sendMessage({
                type: 'googleCalendarError',
                statusCode: statusCode,
                message: message,
                timestamp: Date.now()
            });
        } catch (e) {
            // Popup может быть закрыт - игнорируем
            console.log('Не удалось отправить уведомление в Popup (возможно закрыт)');
        }
    }

    /**
     * Обработка ошибок Axios
     * @param error - ошибка Axios
     * @private
     */
    private async handleAxiosError(error: AxiosError): Promise<never> {
        let statusCode: number | string;
        let message: string;

        // Проверяем на таймаут
        if (error.code === 'ECONNABORTED') {
            statusCode = 'TIMEOUT';
            message = 'Превышено время ожидания ответа от сервера. Проверьте соединение с интернетом.';

            console.error('❌ Таймаут запроса:', message);
            await this.notifyError(statusCode, message);

            throw new Error(message);
        }

        // Проверяем на отсутствие сети
        if (error.message === 'Network Error') {
            statusCode = 'NETWORK_ERROR';
            message = 'Отсутствует соединение с интернетом';

            console.error('❌ Ошибка сети:', message);
            await this.notifyError(statusCode, message);

            throw new Error(message);
        }

        // Обработка HTTP ошибок
        if (error.response) {
            statusCode = error.response.status;
            const data = error.response.data as any;
            message = data?.error?.message || this.getDefaultErrorMessage(statusCode);

            console.error(`❌ HTTP ошибка ${statusCode}:`, message);
            await this.notifyError(statusCode, message);

            // Особые случаи
            if (statusCode === 401) {
                // Неавторизован - пробуем обновить токен
                this.lastActiveToken = undefined;
            }

            throw new Error(message);
        }

        // Другие ошибки
        statusCode = 'UNKNOWN_ERROR';
        message = error.message || 'Неизвестная ошибка';

        console.error('❌ Неизвестная ошибка:', message);
        await this.notifyError(statusCode, message);

        throw error;
    }

    /**
     * Получение сообщения об ошибке по умолчанию
     * @param statusCode - HTTP статус код
     * @private
     */
    private getDefaultErrorMessage(statusCode: number): string {
        switch (statusCode) {
            case 400: return 'Неверный запрос';
            case 401: return 'Требуется повторная авторизация';
            case 403: return 'Доступ запрещен. Проверьте права доступа к календарю.';
            case 404: return 'Ресурс не найден';
            case 429: return 'Слишком много запросов. Пожалуйста, подождите.';
            case 500: return 'Внутренняя ошибка сервера Google';
            case 502: return 'Плохой шлюз';
            case 503: return 'Сервис временно недоступен';
            case 504: return 'Таймаут шлюза';
            default: return `Ошибка ${statusCode}`;
        }
    }

    /**
     * Получение токена ТОЛЬКО для сохраненного пользователя
     * @param interactive - запрашивать ли интерактивную авторизацию
     * @private
     */
    private async getTokenForSavedUser(interactive = false): Promise<string | null> {
        if (!this.currentUser) return null;

        return new Promise((resolve) => {
            browser.identity.getAuthToken({
                interactive,
                account: {id: this.currentUser!.id},
                scopes: import.meta
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

    /**
     * Получение информации о пользователе из Google
     * @param token - токен доступа
     * @private
     */
    private async getUserInfoByToken(token: string): Promise<GoogleUser | null> {
        try {
            const response = await this.axiosInstance.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                {headers: {'Authorization': `Bearer ${token}`}}
            );

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

    /**
     * Проверка статуса сохраненного пользователя
     * @private
     */
    private async checkSavedUserStatus(): Promise<'active' | 'logged_out' | 'switched'> {
        if (!this.currentUser) return 'logged_out';

        try {
            const token = await this.getTokenForSavedUser(false);

            if (!token) {
                return 'logged_out';
            }

            const tokenUser = await this.getUserInfoByToken(token);

            if (tokenUser?.email !== this.currentUser.email) {
                return 'switched';
            }

            this.lastActiveToken = token;

            return 'active';

        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            return 'logged_out';
        }
    }

    /**
     * Отображение системного уведомления
     * @param message - текст уведомления
     * @private
     */
    private async showNotification(message: string): Promise<void> {
        if (this.notificationShown) return;

        this.notificationShown = true;

        setTimeout(() => {
            this.notificationShown = false;
        }, 5 * 60 * 1000);

        await browser.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Google Календарь',
            message: message,
            priority: 2
        });
    }

    /**
     * Запуск периодической проверки
     */
    startPolling(): void {
        if (this.pollInterval) return;

        // Используем setTimeout для первой проверки с задержкой
        setTimeout(() => {
            this.checkForUpdates();
        }, 1000);

        this.pollInterval = setInterval(() => {
            this.checkForUpdates();
        }, this.checkInterval) as unknown as number;
    }

    /**
     * Остановка периодической проверки
     */
    stopPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        // Отменяем все незавершенные запросы
        this.pendingRequests.forEach((controller, requestId) => {
            controller.abort();
            this.pendingRequests.delete(requestId);
        });
    }

    /**
     * Вход в аккаунт Google
     * @returns результат входа
     */
    async login(): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            const token = await new Promise<string>((resolve, reject) => {
                browser.identity.getAuthToken({interactive: true}, (token: any) => {
                    if (browser.runtime.lastError) {
                        reject(browser.runtime.lastError);
                    } else {
                        resolve(token!);
                    }
                });
            });

            const userInfo = await this.getUserInfoByToken(token);
            if (!userInfo) {
                throw new Error('Failed to get user info');
            }

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

    /**
     * Выход из аккаунта Google
     * @returns результат выхода
     */
    async logout(): Promise<{ success: boolean }> {
        this.stopPolling();

        try {
            await new Promise<void>((resolve) => {
                browser.identity.clearAllCachedAuthTokens(resolve);
            });
        } catch (e) {
            console.error('Error during logout:', e);
        }

        this.currentUser = null;
        this.notificationShown = false;
        this.connectionLostNotified = false;
        await this.googleUserStore.removeValue();

        console.log('👋 Выход выполнен');
        return {success: true};
    }

    /**
     * Проверка статуса авторизации
     * @returns статус авторизации
     */
    async checkStatus(): Promise<{
        authenticated: boolean;
        user: GoogleUser | null;
        status: 'active' | 'logged_out' | 'switched';
    }> {
        if (!this.currentUser) {
            return {authenticated: false, user: null, status: 'logged_out'};
        }

        const userStatus = await this.checkSavedUserStatus();

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

    /**
     * Получение событий из календаря
     * @param maxResults - максимальное количество результатов
     * @returns массив событий
     */
    async getEvents(maxResults: number = 2500): Promise<object[]> {
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }

        const status = await this.checkSavedUserStatus();

        if (status === 'logged_out') {
            await this.showNotification(
                `Аккаунт ${this.currentUser.email} вышел из Chrome. Синхронизация приостановлена.`
            );
            throw new Error('User logged out');
        }

        if (status === 'switched') {
            console.log('⚠️ Профиль Chrome переключен, но работаем с:', this.currentUser.email);
        }

        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);
        if (!token) {
            throw new Error('Failed to get token');
        }

        let pageToken: string | null = null;
        let allEvents: any[] = [];

        do {
            try {
                const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');

                const params = new URLSearchParams({
                    maxResults: Math.min(maxResults, 2500).toString(),
                    timeZone: this.timeZone,
                    orderBy: 'startTime',
                    singleEvents: 'true',
                    timeMin: new Date().toISOString(),
                    privateExtendedProperty: `appName=${this.appNameForCalendar}`
                });

                if (pageToken) {
                    params.append('pageToken', pageToken);
                }

                url.search = params.toString();

                const response = await this.axiosInstance.get(url.toString(), {
                    headers: {'Authorization': `Bearer ${token}`}
                });

                if (response.data.items?.length) {
                    allEvents = allEvents.concat(response.data.items);
                }

                pageToken = response.data.nextPageToken;

                if (pageToken) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                // Если это ошибка отмены запроса, просто выходим
                if (axios.isCancel(error)) {
                    console.log('Запрос отменен');
                    break;
                }
                throw error;
            }

        } while (pageToken);

        return allEvents;
    }

    /**
     * Создание события в календаре
     * @param summary - заголовок события
     * @param description - описание события
     * @param startTime - время начала
     * @returns созданное событие
     */
    async createEvent(summary: string, description: string, startTime: Date): Promise<any> {
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }

        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);
        if (!token) {
            throw new Error('Failed to get token');
        }

        const event = {
            summary,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: this.timeZone
            },
            endTimeUnspecified: true,
            description: description,
            extendedProperties: {
                private: {
                    appName: this.appNameForCalendar,
                }
            }
        };

        try {
            const response = await this.axiosInstance.post(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                event,
                {headers: {'Authorization': `Bearer ${token}`}}
            );

            return response.data;
        } catch (error) {
            console.error('Ошибка создания события:', error);
            throw error;
        }
    }

    /**
     * Получение события по ID
     * @param eventId - ID события
     * @returns событие
     */
    async getEventById(eventId: string): Promise<any> {
        const calendarId = 'primary';
        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);

        try {
            const response = await this.axiosInstance.get(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
                {headers: {'Authorization': `Bearer ${token}`}}
            );

            return response.data;
        } catch (error) {
            console.error('Ошибка получения события:', error);
            throw error;
        }
    }

    /**
     * Удаление события
     * @param eventId - ID события
     * @returns true если успешно удалено
     */
    async deleteEvent(eventId: string): Promise<boolean> {
        const calendarId = 'primary';
        const token = this.lastActiveToken || await this.getTokenForSavedUser(false);

        try {
            await this.axiosInstance.delete(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
                {headers: {'Authorization': `Bearer ${token}`}}
            );

            console.log(`✅ Событие ${eventId} успешно удалено`);
            return true;

        } catch (error) {
            console.error('Ошибка удаления события:', error);
            throw error;
        }
    }

    /**
     * Проверка обновлений в календаре
     * @private
     */
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

            const events = await this.getEvents();
            console.log('📅 Получены события:', events.length);

            // Отправляем события в popup асинхронно, не дожидаясь ответа
            this.notifyPopupAboutEvents(events);

        } catch (error: any) {
            console.error('Sync error:', error);
            // Ошибки уже обработаны в handleAxiosError и уведомление отправлено
        }
    }

    /**
     * Уведомление popup о новых событиях (неблокирующее)
     * @param events - массив событий
     * @private
     */
    private async notifyPopupAboutEvents(events: object[]): Promise<void> {
        try {
            await browser.runtime.sendMessage({
                type: 'calendarUpdated',
                events: events,
                userEmail: this.currentUser?.email
            });
        } catch (e) {
            // Popup может быть закрыт - это нормально, просто игнорируем
        }
    }

    /**
     * Пакетная обработка элементов с задержками
     * @param items - массив элементов для обработки
     * @param itemCallback - функция обработки одного элемента
     * @param batchSize - размер пакета
     * @param delayMs - задержка между пакетами в мс
     * @returns результаты обработки
     */
    async processInBatches<T>(
        items: T[],
        itemCallback: (item: T) => Promise<any>,
        batchSize = 5,
        delayMs = 1000
    ): Promise<PromiseSettledResult<any>[]> {
        const results: PromiseSettledResult<any>[] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            console.log(`🔄 Обработка батча ${i / batchSize + 1}, элементы ${i + 1}-${i + batch.length}`);

            const batchResults = await Promise.allSettled(
                batch.map(item => itemCallback(item))
            );

            results.push(...batchResults);

            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        return results;
    }

    /**
     * Инициализация background-скрипта
     */
    initBackground(): void {
        // Обработчик сообщений с поддержкой async/await
        browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // Оборачиваем асинхронные операции в промисы
            (async () => {
                try {
                    switch (request.action) {
                        case 'googleLogin':
                            return await this.login();

                        case 'googleLogout':
                            return await this.logout();

                        case 'googleCheckStatus':
                            return await this.checkStatus();

                        case 'googleGetEvents':
                            const events = await this.getEvents(request.maxResults);
                            return {success: true, events};

                        case 'googleCreateEvent':
                            const event = await this.createEvent(
                                request.reminder.title,
                                request.reminder.desc || '',
                                request.reminder.datetime
                            );
                            return {success: true, event};

                        default:
                            return {success: false, error: 'Unknown action'};
                    }
                } catch (error: any) {
                    return {success: false, error: error.message};
                }
            })().then(sendResponse);

            return true; // Важно! Означает, что ответ будет отправлен асинхронно
        });

        browser.runtime.onStartup?.addListener(() => {
            this.start();
        });

        browser.runtime.onInstalled?.addListener(() => {
            this.start();
        });
    }

    /**
     * Очистка ресурсов при уничтожении сервиса
     */
    destroy(): void {
        this.stopPolling();

        // Отменяем все запросы
        this.pendingRequests.forEach((controller) => {
            controller.abort();
        });
        this.pendingRequests.clear();
    }
}