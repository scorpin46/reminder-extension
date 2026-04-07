import {storage} from '@wxt-dev/storage';
import {detectLocale} from "./helpers";

export interface GoogleUser {
    email: string;
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

export function getFastModeStore() {
    return storage.defineItem<'activeReminders'|'voice'|'text'>('local:fastMode', { 
        fallback: 'text',
    });
}

export function getExpiredCountStore() {
    return storage.defineItem<number>('session:expiredCount', { 
        fallback: 0,
    });
}

export function getShowExpiredItemsStore() {
    return storage.defineItem<boolean>('session:showExpiredItems', { 
        fallback: true,
    });
}

export function getDefaultShowExtraFieldsStore() {
    return storage.defineItem<boolean>('local:defaultShowExtraFields', { 
        fallback: false,
    });
}