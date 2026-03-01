class GoogleAuthManager {
    constructor() {
        this.authState = {
            isAuthed: false,
            email: null,
            token: null,
            lastVerified: 0
        };
        this.verificationInProgress = false;
        this.init();
    }

    async init() {
        await this.verifyAuth();

        this.__setupListeners();
    }

    __setupListeners() {
        // Слушаем запросы от UI
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'checkAuth') {
                this.handleAuthCheck(sendResponse);
                return true;
            }
            if (message.type === 'forceAuthCheck') {
                this.verifyAuth(true).then(sendResponse);
                return true;
            }
        });

        // Слушаем пробуждение компьютера
        chrome.idle?.onStateChanged.addListener((state) => {
            if (state === 'active') {
                // Прошло много времени - лучше проверить
                if (Date.now() - this.authState.lastVerified > 10 * 60 * 1000) {
                    this.verifyAuth();
                }
            }
        });
    }

    async handleAuthCheck(sendResponse) {
        // Если проверяли меньше минуты назад - отдаем кэш
        if (Date.now() - this.authState.lastVerified < 60 * 1000) {
            sendResponse({
                isAuthed: this.authState.isAuthed,
                email: this.authState.email,
                cached: true
            });
            return;
        }

        // Иначе фоновая проверка без ожидания
        this.verifyAuth().then(() => {
            // Ничего не отправляем - ответ уже ушел
        });

        // Отвечаем старыми данными, но с флагом
        sendResponse({
            isAuthed: this.authState.isAuthed,
            email: this.authState.email,
            verifying: true
        });
    }

    async verifyAuth(force = false) {
        if (this.verificationInProgress && !force) return this.authState;

        this.verificationInProgress = true;

        try {
            // Пробуем получить токен без UI
            const token = await this.getToken(false);

            const newState = {
                isAuthed: !!token,
                email: this.authState.email, // сохраняем старый email пока
                lastVerified: Date.now(),
                token: token
            };

            if (token) {
                // Есть токен - получаем свежий email
                try {
                    const email = await this.getEmailFromToken(token);
                    newState.email = email;
                    await this.saveToStorage(email);
                } catch (e) {
                    // Email не получили, но токен есть - авторизация есть
                }
            } else {
                // Токена нет - авторизация точно слетела
                newState.email = null;
                await this.clearStorage();

                // Важно! Оповещаем UI об изменении
                this.broadcastAuthChange(false);
            }

            // Если статус изменился
            if (this.authState.isAuthed !== newState.isAuthed) {
                this.broadcastAuthChange(newState.isAuthed);
            }

            this.authState = newState;

        } finally {
            this.verificationInProgress = false;
        }

        return this.authState;
    }

    broadcastAuthChange(isAuthed) {
        chrome.runtime.sendMessage({
            type: 'authChanged',
            isAuthed: isAuthed
        }).catch(() => {
            // Никто не слушает - ок
        });
    }

    getToken(interactive = false) {
        return new Promise((resolve) => {
            chrome.identity.getAuthToken({ interactive }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    resolve(null);
                } else {
                    resolve(token);
                }
            });
        });
    }

    async getEmailFromToken(token) {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        return data.email;
    }

    async saveToStorage(email) {
        await browser.storage.local.set({
            cachedEmail: email,
            lastAuthCheck: Date.now()
        });
    }

    async clearStorage() {
        await browser.storage.local.remove(['cachedEmail']);
    }
}

export const googleAuthManager = new GoogleAuthManager();