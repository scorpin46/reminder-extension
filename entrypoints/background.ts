import {watch} from "vue";
import {alarmNameToReminderId} from "@/modules/utils/helpers";
import {browser} from 'wxt/browser';
import {Browser} from "@wxt-dev/browser";
import {ReminderService} from "@/modules/reminderService.js";
type Alarm = Browser.alarms.Alarm;
import { defineBackground } from "#imports";
import {GoogleCalendarService} from "@/modules/googleCalendarService";
import {getStoredGoogleAuthAlertIdStore} from "@/modules/utils/storage";

export default defineBackground(() => {
    let popupWindowId: number | null = null;

    const openMainWindow = (): void => {
        browser.windows.getLastFocused((lastWindow) => {
            const width = 500;
            const CHROME_UI_OFFSET = 95;
            const height = lastWindow.height! - CHROME_UI_OFFSET;
            const left = lastWindow.left! + lastWindow.width! - width;
            const top = CHROME_UI_OFFSET;
            const maxWidth = 700;

            browser.windows.create(
                {
                    url: browser.runtime.getURL("/main.html"),
                    type: "popup",
                    width: width,
                    height: height,
                    left: left,
                    top: top,
                    focused: true,
                },
                (window) => {
                    popupWindowId = window?.id!;

                    browser.windows.onBoundsChanged.addListener(function onMaximize(
                        windowInfo
                    ) {
                        if (windowInfo.id !== popupWindowId) return;

                        browser.windows.get(popupWindowId!, (currentWindow) => {
                            if (!currentWindow) return;
                        });
                    });
                }
            );
        });
    };

    const openPostponeWindow = (reminderId: number | string): void => {
        browser.windows.getLastFocused((lastWindow) => {
            const width = 460;
            const height = 370;
            const left = lastWindow.left! + lastWindow.width! - width;
            const top = lastWindow.height! - height;

            browser.windows.create({
                url: browser.runtime.getURL(`/postpone.html`) + `?id=${reminderId}`,
                type: "popup",
                width: width,
                height: height,
                left: left,
                top: top,
                focused: true,
            });
        });
    };

    browser.action.onClicked?.addListener(() => {
        if (popupWindowId) {
            browser.windows.get(popupWindowId, (window) => {
                if (!browser.runtime.lastError) {
                    browser.windows.update(popupWindowId!, {focused: true});
                } else {
                    openMainWindow();
                }
            });
        } else {
            openMainWindow();
        }
    });

    browser.windows.onRemoved?.addListener((windowId) => {
        if (windowId === popupWindowId) {
            popupWindowId = null;
        }
    });

    browser.alarms.onAlarm?.addListener(async (alarm: Alarm) => {
        const reminderId = alarmNameToReminderId(alarm.name);
        const reminderService = ReminderService.instance();
        
        if (reminderId) {
            const reminder = await reminderService.repository.getById(reminderId);

            if (reminder?.id && !reminder.completed) {
                const notificationId = await browser.notifications.create({
                    type: "basic",
                    iconUrl: browser.runtime.getURL("/icon/128.png"),
                    title: "🔔 Напоминание",  //todo перевод
                    message: reminder.title,
                    contextMessage: reminder.desc!,
                    requireInteraction: true,
                  
                    buttons: [{title: "🕒 Postpone"}, {title: "✅ Mark as Done"}],
                });

                await reminderService.repository.update(reminder.id, {notificationId});
            }
        }
    });

    browser.notifications.onButtonClicked?.addListener(async (notificationId: string, buttonIndex: number) => {
        const reminder = await ReminderService.instance().repository.getByNotificationId(notificationId);
      
        if (reminder?.id){
            if (buttonIndex === 1) {
                await ReminderService.instance().completeReminder(reminder, false);
                await GoogleCalendarService.instance().deleteEvent(reminder.googleEventId!); //чтобы сработало нужно именно так и здесь
            } else if (buttonIndex === 0) {
                openPostponeWindow(reminder.id);
            }
        } else {
            const authAlertId = await getStoredGoogleAuthAlertIdStore().getValue();
            
            if (notificationId === authAlertId) {
                await GoogleCalendarService.instance().login();
            }
        }
    });

    browser.action.setBadgeBackgroundColor({color: "#4688F1"});
    browser.action.setBadgeTextColor({color: "white"});

    browser.tabs.onUpdated?.addListener((tabId, changeInfo, tab) => {
        // Проверяем, относится ли эта вкладка к нашему popup-окну
        if (popupWindowId && tab.windowId === popupWindowId) {
            // Если страница стала about:blank или загружен другой URL
            if (changeInfo.url === 'about:blank' ||
                (changeInfo.url && !changeInfo.url.startsWith(browser.runtime.getURL('')))) {

                browser.windows.remove(popupWindowId);
                popupWindowId = null;
            }
        }
    });


    watch(() => ReminderService.instance().repository.state.active.length, (value) => {
        browser.action.setBadgeText({text: (value || "").toString()});
    }, {immediate: true});

    
    browser.alarms.onAlarm?.addListener((alarm) => {
        browser.action.setBadgeText({text: (ReminderService.instance().repository.state.active.length || "").toString()});

        if (alarm.name === GoogleCalendarService.syncAlarmName) {
            GoogleCalendarService.instance().syncUpdates();
        }
    });

    browser.runtime.onMessage?.addListener((request, sender, sendResponse) => {
        console.log('📨 Получено сообщение:', request.action, request);

        const handleMessage = async () => {
            try {
                const calendar = GoogleCalendarService.instance();

                switch (request.action) {
                    case 'googleLogin':
                        return await calendar.login();
                    case 'importFromGoogle':
                        return await calendar.importFromGoogle();
                    case 'googleLogout':
                        return await calendar.logout();
                    case 'googleCheckStatus':
                        if (!calendar.currentUser) {
                            return { authenticated: false };
                        }
                        const isValidUser = await calendar.checkUser();
                        return {
                            authenticated: isValidUser,
                            user: calendar.currentUser,
                            message: !isValidUser ? `Пользователь не авторизован или возникли проблемы, попробуйте перезагрузить или повторить позднее` : undefined
                        };
                    case 'googleUpdateEvent':
                        const reminder = await calendar.reminderService.repository.getById(request.reminderId);
                        if (reminder) {
                            await calendar.updateEventByReminder(reminder);
                        }
                        return { success: true }; // Всегда возвращаем ответ
                    case 'googleDeleteEvent':
                        console.log('Удаление события:', request.googleEventId);
                        await calendar.deleteEvent(request.googleEventId);
                        return { success: true };
                    case 'googleCreateEvent':
                        const newReminder = await calendar.reminderService.repository.getById(request.reminderId);
                        if (newReminder) {
                            await calendar.createEventByReminder(newReminder);
                        }
                        return { success: true };
                    default:
                        console.warn('Неизвестное действие:', request.action);
                        return { success: false, error: 'Unknown action' };
                }
            } catch (error: any) {
                console.error('Ошибка в обработчике сообщений:', error);
                return { success: false, error: error.message };
            }
        };

        // В современном API можно просто вернуть Promise
        // return handleMessage(); // Работает в новых версиях

        // Для обратной совместимости оставляем старый подход, но улучшаем его
        handleMessage()
            .then(response => {
                try {
                    sendResponse(response);
                } catch (e) {
                    // Игнорируем ошибку "канал закрыт"
                    console.debug('Канал уже закрыт, ответ не отправлен');
                }
            })
            .catch(error => {
                console.error('Необработанная ошибка:', error);
                try {
                    sendResponse({ success: false, error: error.message });
                } catch (e) {
                    // Игнорируем
                }
            });

        return true; // Важно для асинхронности
    });

    // При старте браузера
    browser.runtime.onStartup?.addListener(() => {
        GoogleCalendarService.instance().run().catch(console.error);
    });

    // При установке/обновлении
    browser.runtime.onInstalled?.addListener(() => {
        GoogleCalendarService.instance().run().catch(console.error);
    });

});