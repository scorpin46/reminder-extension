import {defineConfig} from 'wxt';
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
            "identity",
            "identity.email",
            // "offscreen",
            "scripting"
        ],
        "action": {
            default_title: '__MSG_appName__',
            default_icon: {
                16: 'icon/16.png',
                24: 'icon/24.png',
                32: 'icon/32.png',
                48: 'icon/48.png',
                96: 'icon/96.png',
                128: 'icon/128.png',
            },
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
        ],
    }),
    modules: [
        '@wxt-dev/module-vue',
        '@wxt-dev/auto-icons'
    ],
    modulesDir: "wxt-modules",
    consoleForward: {
        levels: ['log', 'warn', 'error', 'info', 'debug'],
        forwardErrors: true,
    },

    imports: false,

    hooks: {
        'vite:build:extendConfig': (entrypoints, config) => {
            const isProd = process.env.NODE_ENV === 'production' || process.env.MODE === 'production';
            if (!isProd) return;
            config.build ??= {};
            config.build.rollupOptions ??= {};

            // Устанавливаем имена чанков
            config.build.rollupOptions.output = {
                ...(typeof config.build.rollupOptions.output === 'object' ? config.build.rollupOptions.output : {}),
                chunkFileNames: 'chunks/chunk-[hash].js',

                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === 'background') {
                        return 'background.js';
                    }
                    if (chunkInfo.name?.includes('content')) {
                        return 'content-scripts/[name].js';
                    }

                    return 'chunks/chunk-[hash].js';
                },
            };

            config.build.chunkSizeWarningLimit = 2000;
            config.build.minify = 'terser';
            // config.build.sourcemap = true; //для отладки локально
            config.build.terserOptions = {
                ecma: 2020,

                // === СЖАТИЕ (compress) ===
                compress: {
                    toplevel: true,
                    drop_console: true,
                    drop_debugger: true,
                    module: true,
                    passes: 2,
                    pure_funcs: [
                        'console.log',
                        'console.info',
                        'console.debug',
                        'console.warn',
                        'console.error'
                    ],
                    pure_getters: 'strict',
                },
                format: {
                    comments: false, // Удаляем комментарии
                },
            };
            
            
            config.optimizeDeps ??= {};
            config.optimizeDeps.exclude = ['node_modules/**/*'];
            
        }
    },
    
});