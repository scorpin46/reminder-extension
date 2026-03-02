import { browser } from "wxt/browser";
import {getStoredGoogleUser, GoogleUser} from "./utils/storage";


export class GoogleCalendarService {
    private currentUser: GoogleUser | null = null;
    private pollInterval?: number | null;
    private readonly checkInterval: number = 60 * 1000; // 1 минута
    private notificationShown: boolean = false; // чтобы не спамить уведомлениями
    private googleUserStore: ReturnType<typeof getStoredGoogleUser>;

    constructor() {
        this.googleUserStore = getStoredGoogleUser();
        
        this.loadStoredUser();
    }

    // Загрузка сохраненного пользователя
    private async loadStoredUser(): Promise<void> {
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

    // Получение информации о пользователе из Google
    private async getUserInfoByToken(token: string): Promise<GoogleUser | null> {
        try {
            const response = await fetch(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                { headers: { 'Authorization': `Bearer ${token}` } }
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

            // Все хорошо - сохраненный пользователь активен
            return 'active';

        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            return 'logged_out';
        }
    }

    // Показ уведомления
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

    // Вход
    async login(): Promise<{ success: boolean; error?: string; user?: GoogleUser }> {
        try {
            // Получаем токен (интерактивно)
            const token = await new Promise<string>((resolve, reject) => {
                browser.identity.getAuthToken({ interactive: true }, (token: any) => {
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

            return { success: true, user: userInfo };
        } catch (error: any) {
            console.error('Ошибка входа:', error);
            return { success: false, error: error.message };
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
        return { success: true };
    }

    // Проверка статуса (вызывается из popup)
    async checkStatus(): Promise<{
        authenticated: boolean;
        user: GoogleUser | null;
        status: 'active' | 'logged_out' | 'switched';
    }> {
        if (!this.currentUser) {
            return { authenticated: false, user: null, status: 'logged_out' };
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
    async getEvents(maxResults: number = 10): Promise<any[]> {
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

        const token = await this.getTokenForSavedUser(false);
        if (!token) {
            throw new Error('Failed to get token');
        }

        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
            `maxResults=${maxResults}&orderBy=startTime&singleEvents=true`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        const data = await response.json();
        return data.items || [];
    }

    // Создание события
    async createEvent(summary: string, startTime: Date, endTime?: Date): Promise<any> {
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }

        const token = await this.getTokenForSavedUser(false);
        if (!token) {
            throw new Error('Failed to get token');
        }

        const event = {
            summary,
            start: { dateTime: startTime.toISOString() },
            end: { dateTime: (endTime || new Date(startTime.getTime() + 3600000)).toISOString() }
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

        return response.json();
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
            const events = await this.getEvents(10);

            browser.runtime.sendMessage({
                type: 'calendarUpdated',
                events: events,
                userEmail: this.currentUser.email
            }).catch(() => {}); // игнорируем ошибки, если popup закрыт

        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // Инициализация
    initBackground(): void {
        // Обработчик сообщений
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
                case 'googleGetEvents':
                    this.getEvents(request.maxResults)
                        .then(events => sendResponse({success: true, events}))
                        .catch(error => sendResponse({success: false, error: error.message}));
                    return true;
                case 'googleCreateEvent':
                    this.createEvent(request.summary, new Date(request.startTime), request.endTime ? new Date(request.endTime) : undefined)
                        .then(event => sendResponse({success: true, event}))
                        .catch(error => sendResponse({success: false, error: error.message}));
                    return true;
            }
        });

        // При старте
        browser.runtime.onStartup?.addListener(() => {
            this.loadStoredUser();
        });

        // При установке/обновлении
        browser.runtime.onInstalled?.addListener(() => {
            this.loadStoredUser();
        });
    }
}