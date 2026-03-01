import { storage } from '@wxt-dev/storage';

export function getStoredLocale() {
    // Инициализация при первом вызове
    return storage.defineItem<string|undefined>(
        'local:locale',
        { defaultValue: undefined }
    );
}