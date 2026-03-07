import {storage} from '@wxt-dev/storage';
import {detectLocale} from "./helpers";

export interface GoogleUser {
    email: string;
    name?: string;
    id: string; // Google ID для точной идентификации
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

export function getStoredAllowGoogleSync() {
    return storage.defineItem<boolean>('local:allowGoogleSync', {
        fallback: false
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