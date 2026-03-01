import {watch} from "vue";
import {alarmNameToReminderId} from "@/modules/utils/helpers";
// import {googleAuthManager} from "@/modules/background/googleAuthManager";
import {browser} from 'wxt/browser';
import {Browser} from "@wxt-dev/browser";
import {ReminderService} from "@/modules/reminderService.js";
type Alarm = Browser.alarms.Alarm;

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

    browser.notifications.onButtonClicked.addListener(
        async (notificationId: string, buttonIndex: number) => {
            const reminderId = await reminderService.repository.getIdByNotificationId(
                notificationId
            );
            browser.notifications.clear(notificationId);

            if (buttonIndex === 0) {
                await reminderService.repository.complete(reminderId);
            } else if (buttonIndex === 1) {
                openPostponeWindow(reminderId);
            }
        }
    );

    watch(() => reminderService.repository.state.active, (value) => {
        browser.action.setBadgeText({text: (value.length || "").toString()});
    }, {immediate: true,});

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

    // async function checkAuthStatus(): Promise<{
    //   isAuthed: boolean;
    //   email: string | null;
    //   token?: string;
    // }> {
    //   return new Promise((resolve) => {
    //     browser.identity.getAuthToken({ interactive: false }, (token) => {
    //       if (browser.runtime.lastError || !token) {
    //         resolve({ isAuthed: false, email: null });
    //         return;
    //       }
    //
    //       fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
    //         headers: { Authorization: `Bearer ${token}` },
    //       })
    //           .then((res) => res.json())
    //           .then((user: { email: string }) => {
    //             resolve({ isAuthed: true, email: user.email, token });
    //           })
    //           .catch(() => {
    //             resolve({ isAuthed: false, email: null });
    //           });
    //     });
    //   });
    // }
    //
    // interface AuthResponse {
    //   success: boolean;
    //   error?: browser.runtime.LastError;
    //   email?: string;
    // }
    //
    // interface CheckAuthResponse {
    //   isAuthed: boolean;
    //   email: string | null;
    //   token?: string;
    // }
    //
    // browser.runtime.onMessage.addListener(
    //     (
    //         message: { type: string },
    //         sender: browser.runtime.MessageSender,
    //         sendResponse: (response: AuthResponse | CheckAuthResponse) => void
    //     ) => {
    //       if (message.type === "loginToGoogle") {
    //         browser.identity.getAuthToken({ interactive: true }, (token) => {
    //           if (browser.runtime.lastError) {
    //             sendResponse({
    //               success: false,
    //               error: browser.runtime.lastError,
    //             });
    //             return;
    //           }
    //
    //           fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
    //             headers: { Authorization: `Bearer ${token}` },
    //           })
    //               .then((res) => res.json())
    //               .then((user: { email: string }) => {
    //                 sendResponse({ success: true, email: user.email });
    //               });
    //         });
    //
    //         return true;
    //       } else if (message.type === "logoutToGoogle") {
    //         browser.identity.getAuthToken({ interactive: false }, (token) => {
    //           if (token) {
    //             fetch("https://accounts.google.com/o/oauth2/revoke?token=" + token)
    //                 .finally(() => {
    //                   browser.identity.removeCachedAuthToken({ token }, () => {
    //                     sendResponse({ success: true });
    //                   });
    //                 });
    //           }
    //         });
    //         return true;
    //       } else if (message.type === "checkAuth") {
    //         checkAuthStatus().then(sendResponse);
    //         return true;
    //       }
    //     }
    // );
});