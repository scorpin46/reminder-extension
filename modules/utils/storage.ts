import {storage} from '@wxt-dev/storage';

export interface GoogleUser {
    email: string;
    name?: string;
    id: string; // Google ID для точной идентификации
}


export function getStoredLocale() {
    return storage.defineItem<string | undefined>(
        'local:locale',
        {fallback: undefined}
    );
}

// export function getStoredGoogleToken() {
//     return storage.defineItem<string | undefined>(
//         'local:googleLastSyncToken',
//         {fallback: undefined}
//     );
// }
//
// export function getStoredGoogleSyncTime() {
//     return storage.defineItem<number | undefined>(
//         'local:googleLastSyncTime',
//         {fallback: undefined}
//     );
// }

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