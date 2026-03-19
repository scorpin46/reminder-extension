import {storage} from '@wxt-dev/storage';
import {detectLocale} from "./helpers";

export interface GoogleUser {
    email: string;
    name?: string;
    id: string;
    chromeAccountId: string;
}


export function getStoredLocale() {
    return storage.defineItem<string>(
        'local:locale',
        {fallback: detectLocale()}
    );
}

export function getStoredGoogleUser() {
    return storage.defineItem<GoogleUser|undefined>('local:googleUser', {
        fallback: undefined
    });
}

export function getStoredGoogleIsAuthenticated() {
    return storage.defineItem<boolean>('session:googleIsAuthenticated', {
        fallback: false
    });
}

export function getStoredGoogleLastSyncTs() {
    return storage.defineItem<number|undefined>('local:googleLastSyncTs', {
        fallback: undefined
    });
}

export function getStoredGoogleAuthAlertIdStore() {
    return storage.defineItem<string|undefined>('session:googleAuthAlertId', {
        fallback: undefined
    });
}

export function getBroadcastErrorStore() {
    return storage.defineItem<string|undefined>('session:broadcastError', {
        fallback: undefined
    });
}