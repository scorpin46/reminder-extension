import {defineConfig} from 'wxt';
// import Vue from '@vitejs/plugin-vue';
// import ReactivityTransform from '@vue-macros/reactivity-transform/vite';
import 'wxt-module-console-forward';

// See https://wxt.dev/api/config.html

export default defineConfig({
    manifest: () => ({
        "name": "__MSG_appName__",
        "version": "1.0.0",
        "description": "__MSG_appDesc__",
        "default_locale": "en",
        "permissions": [
            "notifications",
            "storage",
            "tabs",
            "gcm",
            "contextMenus",
            "activeTab",
            "alarms",
            "notifications",
            "identity",//todo можно убрать?
            "identity.email",
            "offscreen",
            "scripting"
        ],
        "action": {
            default_title: '__MSG_appName__',
        },
        "oauth2": {
            "client_id": import.meta.env.OAUTH_CLIENT_ID,
            "scopes": [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ]
        },
        "web_accessible_resources": [
            {
                "matches": ["*://*.google.com/*"],
                "resources": ["icon/*.png"]
            }
        ]
    }),

    modules: [
        '@wxt-dev/module-vue',
    ],

    consoleForward: {
        levels: ['log', 'warn', 'error', 'info', 'debug'],
        forwardErrors: true, // перехватывать unhandled errors
    },

    imports: false,

    // vite: (config) => ({
    //     ...config,
    //     build: {
    //         sourcemap: process.env.NODE_ENV === 'development' // или false, если проблемы
    //     }
    // })

    // vite: (config) => ({
    //     ...config,
    //     plugins: [
    //         // Сначала плагин трансформации, затем Vue
    //         ReactivityTransform(),
    //         Vue({
    //             // Включаем поддержку макросов в SFC
    //             script: {
    //                 propsDestructure: true,
    //                 defineModel: true,
    //             },
    //         }),
    //     ],
    // }),
});
