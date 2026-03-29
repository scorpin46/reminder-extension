import {watch} from "vue";
import {getReminderIdFromAlarmName} from "@/modules/utils/helpers";
import {browser, Browser} from 'wxt/browser';
import {ReminderService} from "@/modules/reminderService.js";

type Alarm = Browser.alarms.Alarm;
import {defineBackground} from "#imports";
import {GoogleCalendarService} from "@/modules/googleCalendarService";
import {getExpiredCountStore, getStoredGoogleAuthAlertId} from "@/modules/utils/storage";
import {Reminder} from "@/modules/reminderRepository";
import NotificationCreateOptions = Browser.notifications.NotificationCreateOptions;
import {OffscreenManager} from "@/modules/offscreenManager";

export default defineBackground({
    type: 'module',

    main: () => {
        const offscreenManager = new OffscreenManager();
       
        let pendingOpen: Promise<void> | null = null;
        let openedExtensionTabId: number|null|undefined = null;

        const openMainWindow = async (urlParams: Record<string, any> = {}): Promise<void> => {
            // Предотвращаем параллельные вызовы
            if (pendingOpen) {
                return pendingOpen;
            }

            pendingOpen = (async () => {
                const pageUrl = browser.runtime.getURL('/main.html');
                const url = pageUrl + (Object.keys(urlParams).length ? '?' + new URLSearchParams(urlParams).toString() : '');

                // Ищем существующее окно
                const popups = await browser.windows.getAll({
                    populate: true,
                    windowTypes: ['popup']
                });

                const existingWindow = popups.find(w =>
                    w.tabs?.some(tab => tab.url?.includes(pageUrl))
                );

                if (existingWindow?.tabs) {
                    // Обновляем существующее окно
                    const tab = existingWindow.tabs![0];
                    if (urlParams && Object.keys(urlParams).length){
                        await browser.tabs.update(tab.id!, { url });
                    }
                    await browser.windows.update(existingWindow.id!, { focused: true });
                    openedExtensionTabId = tab.id;
                    return;
                }

                // Создаем новое окно
                try {
                    const lastWindow = await browser.windows.getLastFocused();
                    const topOffset = 95;
                    const width = 450;

                    const window = await browser.windows.create({
                        url,
                        type: "popup",
                        width,
                        height: lastWindow.height! - topOffset,
                        left: lastWindow.left! + lastWindow.width! - width,
                        top: topOffset,
                        focused: true,
                    });

                    if (window){
                        const tabs = await browser.tabs.query({ windowId: window.id });
                        openedExtensionTabId = tabs.length ? tabs[0].id : null;
                    }
                } catch (error) {
                    console.error('Failed to create window:', error);
                }
            })();

            try {
                await pendingOpen;
            } finally {
                pendingOpen = null;
            }
        };
        
        
        const openPostponeWindow = async (reminderId: number | string, notificationMode: boolean = false): Promise<void> => {
            try {
                const lastWindow = await browser.windows.getLastFocused();
                const width = 370;
                const height = 460;
                const left = lastWindow.left! + lastWindow.width! - width;
                const top = lastWindow.height! - height;

                await browser.windows.create({
                    url: browser.runtime.getURL(`/postpone.html`) + `?id=${reminderId}&${notificationMode}`,
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
        browser.action.onClicked?.addListener(async () => {
            await openMainWindow();
        });

        browser.alarms.onAlarm?.addListener(async (alarm: Alarm) => {
            if (alarm.name === GoogleCalendarService.syncAlarmName) {
                const isAuth = await GoogleCalendarService.instance().isAuthenticated();

                if (isAuth){
                    await GoogleCalendarService.instance().run(true);
                } else {
                    browser.alarms.clear(GoogleCalendarService.syncAlarmName);
                }
                
                return;
            }
            
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

                    let notificationId = null;
                    
                    try {
                        notificationId = await browser.notifications.create(notifyParams);
                        //@ts-ignore
                        if (reminder.priority) {
                            await offscreenManager.playPriorityAlarmSound(reminder.id);
                        } else {
                            await offscreenManager.playAlarmSound();
                        }
                    } catch (error) {
                        console.error(error);
                    }

                    const newReminderParams:Partial<Reminder> = {notificationId};
                    
                    if (reminder.repeatAfterMin) { //todo этот кейс не доделан, если его использовать в связке с fallback notification
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

        browser.notifications.onClosed.addListener(async (notificationId) => {
            console.log('closed', notificationId);
        })

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

        
        browser.runtime.onMessage?.addListener((request, sender, sendResponse) => {
            const isValidRequest = request.action?.startsWith('');

            const handleMessage = async () => {
                try {
                    if (isValidRequest) {
                        console.log('📨 Получено сообщение:', request.action, request);
                    }

                    let success = false;

                    switch (request.action) {
                        case 'OPEN_HOTKEYS':
                            await browser.tabs.create({
                                url: "chrome://extensions/shortcuts"
                            });
                            
                            return {success: true};
                            
                        case 'OPEN_FROM_FAB':
                            await openMainWindow({id: ''});
                            return {success: true};

                        case 'REINIT_FAB_FOR_CONTENT':
                            const tabs = await browser.tabs.query({ active: true });

                            const promises = tabs.map(async (tab) => {
                                try {
                                    await browser.tabs.sendMessage(tab.id!, {
                                        action: 'REINIT_FAB'
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

                        case 'GOOGLE_LOGIN':
                            return await GoogleCalendarService.instance().login()

                        case 'IMPORT_FROM_GOOGLE':
                            return await GoogleCalendarService.instance().importFromGoogle();

                        case 'GOOGLE_LOGOUT':
                            return await GoogleCalendarService.instance().logout();

                        case 'GOOGLE_CHECK_STATUS':
                            const isValidUser = await GoogleCalendarService.instance().checkUser();
                            return {
                                authenticated: isValidUser,
                                user: GoogleCalendarService.instance().currentUser,
                            };

                        case 'GOOGLE_UPDATE_EVENT':
                            const reminder = await ReminderService.instance().repository.getById(request.reminderId);

                            if (reminder && await GoogleCalendarService.instance().checkUser()){
                                await GoogleCalendarService.instance().updateEventByReminder(reminder);
                                success = true;
                            }

                            return {success: success};

                        case 'GOOGLE_DELETE_EVENT':
                            if (await GoogleCalendarService.instance().checkUser()){
                                await GoogleCalendarService.instance().deleteEvent(request.googleEventId);
                                success = true;
                            }

                            return {success: success};

                        case 'GOOGLE_CREATE_EVENT':
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
            GoogleCalendarService.instance().run();
        });

        // При установке/обновлении
        browser.runtime.onInstalled?.addListener(async (details) => {
            try {
                try {
                    const installId = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
                    const manifest = browser.runtime.getManifest();
                    const version = manifest.version;

                    if (details.reason === 'install') {
                        const welcomeUrl = browser.runtime.getURL('/welcome.html') + `?install_id=${installId}&version=${version}`;
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

                browser.runtime.setUninstallURL('https://docs.google.com/forms/d/e/1FAIpQLSetHCn34pZRZqb8bt0c4yX7II2AoNW7Q72qVquakqxTafNJJg/viewform');

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

        browser.commands.onCommand.addListener(async (command: string) => {
            console.log(`[Background] Получена команда: ${command}`);

            // Получаем активную вкладку
            // todo check open voice
            
            if (command.startsWith("open")) {
                await openMainWindow();
            }

            switch (command) {
                case "open_reminders_list":
                    break;
                    
                case "open_create_by_text":
                    break;

                case "open_create_by_voice":
                    if (openedExtensionTabId) {
                        await browser.tabs.sendMessage(openedExtensionTabId, {
                            type: "CREATE_BY_VOICE"
                        });
                    }
                    break;

                default:
                    console.log(`Неизвестная команда: ${command}`);
            }
        });

        const expiredStore = getExpiredCountStore();

        expiredStore.watch((value) => {
            if (value > 0) {
                browser.action.setBadgeBackgroundColor({color: "rgb(219,84,97)"});
                browser.action.setBadgeTextColor({color: "white"});
                // browser.action.setBadgeText({text: (value || '').toString()});
                browser.action.setBadgeText({text: '!'});
                browser.action.setTitle({title: browser.i18n.getMessage('hasOverdueReminders')});
            } else{
                browser.action.setBadgeText({text: ''});
                browser.action.setTitle({title: browser.i18n.getMessage('appName')});
            }
        });
        
        watch(() => ReminderService.instance().repository.state.active.length, async (value) => {
            expiredStore.setValue(ReminderService.instance().getExpiredReminders().length)
        });
    }
});
