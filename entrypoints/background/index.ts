import {watch} from "vue";
import {alarmNameToReminderId} from "@/modules/utils/helpers";
import {browser} from 'wxt/browser';
import {Browser} from "@wxt-dev/browser";
import {ReminderService} from "@/modules/reminderService.js";
type Alarm = Browser.alarms.Alarm;
import { defineBackground } from "#imports";
import {GoogleCalendarService} from "@/modules/googleCalendarService";

export default defineBackground(() => {
    let popupWindowId: number | null = null;
    const reminderService = ReminderService.instance();

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
            const width = 500;
            const height = 300;
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

    browser.action.onClicked.addListener(() => {
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

    browser.windows.onRemoved.addListener((windowId) => {
        if (windowId === popupWindowId) {
            popupWindowId = null;
        }
    });

    browser.alarms.onAlarm.addListener(async (alarm: Alarm) => {
        const reminderId = alarmNameToReminderId(alarm.name);
        
        if (reminderId) {
            const reminder = await reminderService.repository.getById(reminderId);

            if (reminder && !reminder.completed) {
                const notificationId = await browser.notifications.create({
                    type: "basic",
                    iconUrl: browser.runtime.getURL("/icon/128.png"),
                    title: "🔔 Напоминание",
                    message: reminder.title,
                    contextMessage: reminder.desc,
                    requireInteraction: true,
                    buttons: [{title: "✅ Mark as Done"}, {title: "🕒 Postpone"}],
                });

                await reminderService.repository.update(reminder.id, {notificationId});
            }
        }
    });

    browser.notifications.onButtonClicked.addListener(async (notificationId: string, buttonIndex: number) => {
            const reminderId = await reminderService.repository.getIdByNotificationId(
                notificationId
            );
            browser.notifications.clear(notificationId);

            if (buttonIndex === 0) {
                await reminderService.repository.complete(reminderId);
            } else if (buttonIndex === 1) {
                openPostponeWindow(reminderId);
            }
        });

    browser.action.setBadgeBackgroundColor({color: "#4688F1"});
    browser.action.setBadgeTextColor({color: "white"});

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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


    watch(() => reminderService.repository.state.active.length, (value) => {
        browser.action.setBadgeText({text: (value || "").toString()});
    }, {immediate: true});

    const calendar = new GoogleCalendarService();

    calendar.initBackground();

});