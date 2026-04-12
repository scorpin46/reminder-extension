import {browser} from "wxt/browser";
import {useToast} from "vue-toastification";
const toast = useToast();

export const sendGoogleLoginMessage = (callback) => {
    browser.runtime.sendMessage({action: 'GOOGLE_LOGIN'}, (response) => {
        try {
            if (!response.success) {
                toast.error(browser.i18n.getMessage("errorAuth"), {timeout: 5000});
            } else if (!response.silent) {
                toast.success(browser.i18n.getMessage('successAuth', [response.user.email]), {id: 'successAuth'});
            }

            if (callback && typeof callback === 'function') {
                callback(response)
            }
        } catch (e) {
            console.error(e);
        }
    });
}

export const sendGoogleCheckStatusMessage = (callback) => {
    browser.runtime.sendMessage({ action : 'GOOGLE_CHECK_STATUS' }, (response) => {
        try {
            if (callback && typeof callback === 'function') {
                callback(response)
            }
        } catch (e) {
            console.error(e);
        }
    });
}

export const sendGoogleLogoutMessage = (callback) => {
    browser.runtime.sendMessage({ action : 'GOOGLE_LOGOUT'}, async (response) => {
        try {
            if (callback && typeof callback === 'function') {
                callback(response)
            }
        } catch (e) {
            console.error(e);
        }
    });
}