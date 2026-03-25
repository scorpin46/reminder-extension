import {watch} from "vue";
import {getReminderIdFromAlarmName} from "@/modules/utils/helpers";
import {browser, Browser} from 'wxt/browser';
import {ReminderService} from "@/modules/reminderService.js";

type Alarm = Browser.alarms.Alarm;
import {defineBackground} from "#imports";
import {GoogleCalendarService} from "@/modules/googleCalendarService";
import {getStoredGoogleAuthAlertId} from "@/modules/utils/storage";
import {Reminder} from "@/modules/reminderRepository";
import NotificationCreateOptions = Browser.notifications.NotificationCreateOptions;

export default defineBackground({
    type: 'module',

    main: () => {
        let popupWindowId: number | null = null;
        let isWindowOpening = false;
        let boundsChangeListener: ((windowInfo: Browser.windows.Window) => void) | null = null;
        
        // Функция для фокусировки существующего окна и обновления параметров
        const focusExistingWindow = async (urlParams: Record<string, any>) => {
            if (!popupWindowId) return;

            try {
                const window = await browser.windows.get(popupWindowId, {populate: true});

                const tab = window.tabs ? window.tabs[0] : null;
                if (!tab?.url) return;

                // Обновляем URL с новыми параметрами
                const url = new URL(tab.url);
                url.search = new URLSearchParams(urlParams).toString();

                await browser.tabs.update(tab.id, {url: url.toString()});
                await browser.windows.update(popupWindowId, {focused: true});
            } catch (error) {
                console.error('Error focusing existing window:', error);
                popupWindowId = null;
                await createNewWindow(urlParams);
            }
        };

        // Функция создания нового окна
        const createNewWindow = async (urlParams: Record<string, any>) => {
            isWindowOpening = true;

            try {
                const lastWindow = await browser.windows.getLastFocused();

                const width = 450;
                const CHROME_UI_OFFSET = 95;
                const height = lastWindow.height! - CHROME_UI_OFFSET;
                const left = lastWindow.left! + lastWindow.width! - width;
                const top = CHROME_UI_OFFSET;

                const window = await browser.windows.create({
                    url: browser.runtime.getURL("/main.html") + '?' + new URLSearchParams(urlParams).toString(),
                    type: "popup",
                    width: width,
                    height: height,
                    left: left,
                    top: top,
                    focused: true,
                });

                popupWindowId = window?.id!;

                // Удаляем старый слушатель, если он есть
                if (boundsChangeListener) {
                    browser.windows.onBoundsChanged.removeListener(boundsChangeListener);
                }

                // Добавляем обработчик изменения размеров
                boundsChangeListener = (windowInfo: Browser.windows.Window) => {
                    if (windowInfo.id !== popupWindowId) return;
                    // Логика обработки изменения размеров
                };

                browser.windows.onBoundsChanged.addListener(boundsChangeListener);
            } catch (error) {
                console.error('Failed to create window:', error);
            } finally {
                isWindowOpening = false;
            }
        };

        const openMainWindow = async (urlParams = {}): Promise<void> => {
            // Предотвращаем параллельное открытие окон
            if (isWindowOpening) {
                if (popupWindowId) {
                    await focusExistingWindow(urlParams);
                }
                return;
            }

            // Проверяем, существует ли окно и активно ли оно
            if (popupWindowId) {
                try {
                    await browser.windows.get(popupWindowId, {populate: true});
                    // Окно существует — обновляем URL и фокусируем
                    await focusExistingWindow(urlParams);
                } catch (error) {
                    // Окно не существует (было закрыто) — создаём новое
                    await createNewWindow(urlParams);
                }
            } else {
                // ID окна не установлен — создаём новое
                await createNewWindow(urlParams);
            }
        };

        const openPostponeWindow = async (reminderId: number | string): Promise<void> => {
            try {
                const lastWindow = await browser.windows.getLastFocused();
                const width = 370;
                const height = 460;
                const left = lastWindow.left! + lastWindow.width! - width;
                const top = lastWindow.height! - height;

                await browser.windows.create({
                    url: browser.runtime.getURL(`/postpone.html`) + `?id=${reminderId}`,
                    type: "popup",
                    width: width,
                    height: height,
                    left: left,
                    top: top,
                    focused: true,
                });
            } catch (error) {
                console.error('Failed to open postpone window:', error);
            }
        };

        // Обработчики событий с использованием Promise API
        browser.action.onClicked?.addListener(() => {
            openMainWindow();
        });

        // Очищаем ID окна при его закрытии
        browser.windows.onRemoved?.addListener((windowId) => {
            if (windowId === popupWindowId) {
                popupWindowId = null;
                // Удаляем слушатель изменений размеров
                if (boundsChangeListener) {
                    browser.windows.onBoundsChanged.removeListener(boundsChangeListener);
                    boundsChangeListener = null;
                }
            }
        });

        browser.alarms.onAlarm?.addListener(async (alarm: Alarm) => {
            const reminderId = getReminderIdFromAlarmName(alarm.name);
            const reminderService = ReminderService.instance();

            if (reminderId) {
                const reminder = await reminderService.repository.getById(reminderId);

                if (reminder?.id && !reminder.completed) {
                    const notifyParams: NotificationCreateOptions = {
                        type: "basic",
                        iconUrl: browser.runtime.getURL("/icon/128.png"),
                        title: '',
                        message: reminder.title,
                        contextMessage: reminder.desc!,
                        requireInteraction: true,
                        priority: 2,
                        buttons: [
                            {title: browser.i18n.getMessage('alertPostponeBtn')},
                            {title: browser.i18n.getMessage('alertCompleteBtn')}
                        ],
                    };
                    
                    const url = reminder.url  || '';
                    
                    if (url.length > 7) { //тут Url в приоритете, т.к. он может быть повторяемым
                        notifyParams.buttons = [{title: '✅ ОК'}];
                        notifyParams.title = '🔗 ' + browser.i18n.getMessage('linkIsOpened');
                        notifyParams.message = reminder.title;
                        notifyParams.contextMessage = reminder.url!;
                        // notifyParams.requireInteraction = false;
                        //todo Добавить повтор и в гугл
                    } else if (reminder.repeatAfterMin) {
                        notifyParams.buttons = [{title: '✅ ОК'}];
                    }
                    
                    const notificationId = await browser.notifications.create(notifyParams);

                    const newReminderParams:Partial<Reminder> = {notificationId};
                    
                    if (reminder.repeatAfterMin) {
                        let nextDatetime = +reminder.datetime;
                        while (nextDatetime <= Date.now()) {
                            nextDatetime += reminder.repeatAfterMin * 60000;
                        }
                        newReminderParams.datetime = new Date(nextDatetime);
                    } else if (reminder.url) { // если не повторяемый url
                        newReminderParams.completed = 1;

                        browser.tabs.create({ url: reminder.url, active: true });
                    }
                    
                    await reminderService.repository.update(reminder.id, newReminderParams);
                }
            }
        });
        
        browser.notifications.onClicked.addListener(async (notificationId) => {
            const reminder = await ReminderService.instance().repository.getByNotificationId(notificationId);

            if (reminder?.id) {
                await openMainWindow()
            }
        });

        browser.notifications.onButtonClicked?.addListener(async (notificationId: string, buttonIndex: number) => {
            //Уведомление о необходимости авторизоваться
            const authAlertId = await getStoredGoogleAuthAlertId().getValue();

            if (notificationId === authAlertId) {
                await GoogleCalendarService.instance().login();
                return;
            }
            
            const reminder = await ReminderService.instance().repository.getByNotificationId(notificationId);

            if (!reminder || reminder.url || reminder.repeatAfterMin){
                return;
            }

            if (buttonIndex === 1) {
                await ReminderService.instance().complete(reminder, false);
                await GoogleCalendarService.instance().deleteEvent(reminder.googleEventId!);
            } else if (buttonIndex === 0) {
                await openPostponeWindow(reminder.id!);
            }
        });

        browser.action.setBadgeBackgroundColor({color: "rgb(29,93,142)"});
        browser.action.setBadgeTextColor({color: "white"});

        browser.tabs.onUpdated?.addListener(async (tabId, changeInfo, tab) => {
            // Проверяем, относится ли эта вкладка к нашему popup-окну
            if (popupWindowId && tab.windowId === popupWindowId) {
                // Если страница стала about:blank или загружен другой URL
                if (changeInfo.url === 'about:blank' ||
                    (changeInfo.url && !changeInfo.url.startsWith(browser.runtime.getURL('')))) {

                    try {
                        browser.windows.remove(popupWindowId);
                        popupWindowId = null;
                    } catch (error) {
                        console.error('Error removing window:', error);
                    }
                }
            }
        });

        watch(() => ReminderService.instance().repository.state.active.length, async (value) => {
            try {
                browser.action.setBadgeText({text: (value || "").toString()});
            } catch (error) {
                console.error('Error updating badge text:', error);
            }
        }, {immediate: true});

        browser.alarms.onAlarm?.addListener(async (alarm) => {
            browser.action.setBadgeText({
                text: (ReminderService.instance().repository.state.active.length || "").toString()
            });

            if (alarm.name === GoogleCalendarService.syncAlarmName) {
                const isAuth = await GoogleCalendarService.instance().isAuthenticated();
                
                if (isAuth){
                    await GoogleCalendarService.instance().run(true);
                } else {
                    browser.alarms.clear(GoogleCalendarService.syncAlarmName);
                }
            }
        });

        browser.runtime.onMessage?.addListener((request, sender, sendResponse) => {
            const isValidRequest = request.action?.startsWith('SAR__');

            const handleMessage = async () => {
                try {
                    if (isValidRequest) {
                        console.log('📨 Получено сообщение:', request.action, request);
                    }

                    let success = false;

                    switch (request.action) {
                        case 'SAR__OPEN_FROM_FAB':
                            await openMainWindow({id: ''});
                            return {success: true};

                        case 'SAR__REINIT_FAB_FOR_CONTENT':
                            const tabs = await browser.tabs.query({ active: true });

                            const promises = tabs.map(async (tab) => {
                                try {
                                    await browser.tabs.sendMessage(tab.id!, {
                                        action: 'SAR__REINIT_FAB'
                                    });
                                    return { tabId: tab.id, success: true };
                                } catch (error: any) {
                                    return {
                                        tabId: tab.id,
                                        success: false,
                                        error: error.message
                                    };
                                }
                            });

                            await Promise.all(promises);
                            
                            return {success: true};

                        case 'SAR__GOOGLE_LOGIN':
                            return await GoogleCalendarService.instance().login()

                        case 'SAR__IMPORT_FROM_GOOGLE':
                            return await GoogleCalendarService.instance().importFromGoogle();

                        case 'SAR__GOOGLE_LOGOUT':
                            return await GoogleCalendarService.instance().logout();

                        case 'SAR__GOOGLE_CHECK_STATUS':
                            const isValidUser = await GoogleCalendarService.instance().checkUser();
                            return {
                                authenticated: isValidUser,
                                user: GoogleCalendarService.instance().currentUser,
                            };

                        case 'SAR__GOOGLE_UPDATE_EVENT':
                            const reminder = await ReminderService.instance().repository.getById(request.reminderId);

                            if (reminder && await GoogleCalendarService.instance().checkUser()){
                                await GoogleCalendarService.instance().updateEventByReminder(reminder);
                                success = true;
                            }

                            return {success: success};

                        case 'SAR__GOOGLE_DELETE_EVENT':
                            if (await GoogleCalendarService.instance().checkUser()){
                                await GoogleCalendarService.instance().deleteEvent(request.googleEventId);
                                success = true;
                            }

                            return {success: success};

                        case 'SAR__GOOGLE_CREATE_EVENT':
                            const newReminder = await ReminderService.instance().repository.getById(request.reminderId);

                            if (newReminder && await GoogleCalendarService.instance().checkUser()){
                                await GoogleCalendarService.instance().createEventByReminder(newReminder);
                                success = true;
                            }
                            return {success: success};

                        default:
                            if (isValidRequest) {
                                console.warn('Неизвестное действие:', request.action);
                            }
                            return {success: false, error: 'Unknown action'};
                    }
                } catch (error: any) {
                    console.error('Ошибка в обработчике сообщений:', error);
                    return {success: false, error: error.message};
                }
            }

            handleMessage()
                .then(response => {
                    try {
                        sendResponse(response);
                    } catch (e) {
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

            return true; // Для асинхронных обработчиков
        });

        // При старте браузера
        browser.runtime.onStartup?.addListener(() => {
            GoogleCalendarService.instance().run()
        });

        // При старте браузера
        browser.runtime.onStartup?.addListener(() => {
            GoogleCalendarService.instance().run()
        });

        // При установке/обновлении
        browser.runtime.onInstalled?.addListener(async (details) => {
            try {
                try {
                    if (details.reason === 'install') {
                        const welcomeUrl = browser.runtime.getURL('/welcome.html');
                        browser.tabs.create({ url: welcomeUrl, active: true});
                    }
                } catch (err) {
                    console.error('Failed to register content script:', err);
                }
              
                // Очищаем старые контекстные меню
                await browser.contextMenus.removeAll();

                const documentUrlPatterns = ["http://*/*", "https://*/*"];

                browser.contextMenus.create({
                    id: "set-a-reminder-selection",
                    title: browser.i18n.getMessage("contextmenu_setSelectionReminder"),
                    contexts: ["selection"],
                });
                
                browser.contextMenus.create({
                    id: "set-a-reminder-link",
                    title: browser.i18n.getMessage("contextmenu_setLinkReminder"),
                    contexts: ["link"],
                    documentUrlPatterns,
                });
                browser.contextMenus.create({
                    id: "set-a-reminder-img",
                    title: browser.i18n.getMessage("contextmenu_setImgReminder"),
                    contexts: ["image"],
                    documentUrlPatterns,
                });
                browser.contextMenus.create({
                    id: "set-a-reminder-video",
                    title: browser.i18n.getMessage("contextmenu_setVideoReminder"),
                    contexts: ["video"],
                    documentUrlPatterns,
                });
                browser.contextMenus.create({
                    id: "set-a-reminder-audio",
                    title: browser.i18n.getMessage("contextmenu_setAudioReminder"),
                    contexts: ["audio"],
                    documentUrlPatterns,
                });
                browser.contextMenus.create({
                    id: "set-a-reminder",
                    title: browser.i18n.getMessage("contextmenu_reminderSite"),
                    contexts: ["page", "frame"],
                    documentUrlPatterns,
                });

                GoogleCalendarService.instance().run();
            } catch (error) {
                console.error('Error during installation:', error);
            }
        });

        browser.contextMenus.onClicked.addListener(async (info, tab) => {
            if (info.menuItemId.toString().startsWith('set-a-reminder')) {
                const selectionText = info.selectionText?.trim() || '';
                let url = info.srcUrl ?? info.linkUrl;

                if (url) {
                    await openMainWindow({
                        url: url,
                        title: tab?.title// || url.split('/').pop(), // не лучший вариант если юзеру нужно осмысленное своё название
                    });
                } else if (selectionText.length) {
                    await openMainWindow({
                        title: selectionText
                    });
                } else {
                    url = tab?.url ?? info.frameUrl;
                    await openMainWindow({
                        url: url,
                        title: tab?.title// || url.split('/').pop(),
                    });
                }
            }
        });
    }
});
