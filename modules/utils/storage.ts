import {storage} from '@wxt-dev/storage';
import {detectLocale} from "./helpers";

export interface GoogleUser {
    email: string;
    name?: string;
    id: string;
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

export function getStoredGoogleAuthAlertId() {
    return storage.defineItem<string|undefined>('session:googleAuthAlertId', {
        fallback: undefined
    });
}

export function getStoredGoogleCalendarId() {
    return storage.defineItem<string|undefined>('local:googleCalendarId', {
        fallback: undefined
    });
}

export function getBroadcastErrorStore() {
    return storage.defineItem<string|undefined>('session:broadcastError', {
        fallback: undefined
    });
}

export function getFabVoiceModeStore() {
    return storage.defineItem<boolean|undefined>('local:fabVoiceMode', {
        fallback: false
    });
}

export function getFabTopPercentStore() {
    return storage.defineItem<boolean|undefined>('local:fabTopPercent', {
        fallback: false
    });
}