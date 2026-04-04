import {browser} from "wxt/browser";
import {useToast} from "vue-toastification";
const toast = useToast();

export const sendGoogleLoginMessage = (callback) => {
    browser.runtime.sendMessage({ action: 'GOOGLE_LOGIN' }, (response) => {
        console.log(response);
        if (!response.success) {
            toast.error(browser.i18n.getMessage("errorAuth"), {timeout: 5000});
        } else if (!response.silent){
            toast.success(browser.i18n.getMessage('successAuth', [response.user.email]), {id: 'successAuth'});
        }

        if (callback && typeof callback === 'function') {
            callback(response)
        }
    });
}

export const sendGoogleCheckStatusMessage = (callback) => {
    browser.runtime.sendMessage({ action : 'GOOGLE_CHECK_STATUS' }, (response) => {
        if (callback && typeof callback === 'function') {
            callback(response)
        }
    });
}

export const sendGoogleLogoutMessage = (callback) => {
    browser.runtime.sendMessage({ action : 'GOOGLE_LOGOUT'}, async (response) => {
        if (callback && typeof callback === 'function') {
            callback(response)
        }
    });
}