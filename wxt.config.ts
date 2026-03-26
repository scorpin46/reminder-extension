import {defineConfig} from 'wxt';
import 'wxt-module-console-forward';

// See https://wxt.dev/api/config.html

export default defineConfig({
    manifest: ({browser}) => ({
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
            "offscreen",
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
        ...(browser === 'chrome' && {
            key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmg45dP9ZQdD+364Cb+PMdm2AqGbnlZ36y0CRSQtVZs2KI+wGNNGsLVzfrshLOX5pk4uzSPECVLB1W0KDdgQDxnvnUquwT5adfYYu/IbcNwQrACUbf7OKcalefXpBg07khXTT5o08ESBij07VITXVPsPmWE+UTnT0iMLCiHPnu7EHYRNH8RlkoSnudxqvi0qzuo19jaw/ioZKa1WyCTcWSKWvFXCKG5v3ZxmTotPCbmXncCceasD7yARtp0ZSMHy91fuX2K4NH1Pzc3F3vFVu8HuVyIlLLOmp2f8vQf25B6tfPiSO3mRyRNAEV7VRvNM6qqm2fETDDh1Q17YGjv+SYwIDAQAB',
        }),
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
                "resources": ["icon/*.png", "audio/*"]
            }
        ],
        "commands": {
            "_execute_action": {
                "suggested_key": {
                    "default": "Alt+Shift+R",
                }
            }
        //     "reminders_list": {
        //         "suggested_key": {
        //             "default": "Ctrl+Shift+3",
        //             "mac": "Command+Shift+3"
        //         },
        //         "description": "__MSG_fastModeRunActiveReminders__"
        //     },
        //     "create_by_voice": {
        //         "suggested_key": {
        //             "default": "Ctrl+Shift+2",
        //             "mac": "Command+Shift+2"
        //         },
        //         "description": "__MSG_fastModeRunVoice__"
        //     },
        //     "create_by_text": {
        //         "suggested_key": {
        //             "default": "Ctrl+Shift+1",
        //             "mac": "Command+Shift+1"
        //         },
        //         "description": "__MSG_fastModeRunText__"
        //     }
        }
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