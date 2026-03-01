import { resolve } from 'node:path';
import { defineWebExtConfig } from 'wxt';

// const browserUserDataDirectory = resolve('.wxt/chrome-data');  //директория должна существовать
export default defineWebExtConfig({
    disabled: true, //отключает открытие отдельного браузера (в результате , при изменении background приходится самому обновлять расширение, либо можно настроить vite)

    //хранит историю профиля хром
    // chromiumProfile: browserUserDataDirectory,
    // keepProfileChanges: true,
    // chromiumArgs: [
    //     // For example, this flag enables the Prompt API
    //     '--disable-features=DisableLoadExtensionCommandLineSwitch',
    //     '--user-data-dir=' + browserUserDataDirectory,
    // ],
});