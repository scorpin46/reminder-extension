import {browser} from "wxt/browser";

/**
 * Класс для управления воспроизведением звуков
 * Поддерживает обычные и приоритетные звуки с очередью
 */
class SoundManager {
    constructor() {
        // Множество ID активных приоритетных напоминаний
        this.#activePriorityReminderIds = new Set();

        // Аудио элементы
        this.#priorityAudio = null;      // Для приоритетных звуков (циклическое воспроизведение)
        this.#regularAudio = null;       // Для обычных звуков (однократное воспроизведение)

        // Флаги и очереди
        this.#isRegularPlaying = false;           // Играет ли обычный звук
        this.#pendingPrioritySounds = [];          // Очередь ожидающих приоритетных звуков

        // Таймауты
        this.#soundPlayTimeout = null;             // Таймаут для обычного звука
        this.#MAX_SOUND_DURATION = 20000;          // Максимальная длительность звука (20 секунд)

        this.#prioritySoundTimeout = null;         // Таймаут для приоритетного звука
        this.#DEFAULT_PRIORITY_SOUND_TIMEOUT = 300000; // 5 минут по умолчанию
        this.#priorityTimeoutStartTime = 0;        // Время начала таймаута
        this.#priorityTimeoutRemainingTime = 0;    // Оставшееся время таймаута

        // Привязываем обработчики событий
        this.#regularSoundEndedHandler = this.#handleRegularSoundEnded.bind(this);
        this.#regularSoundErrorHandler = this.#handleRegularSoundError.bind(this);

        // Инициализация
        this.#regularAudio = this.#createAudioElement();
        this.#priorityAudio = this.#createAudioElement();
        this.#setupRegularAudioListeners();

        console.debug("SoundManager initialized");
    }

    #activePriorityReminderIds;
    #priorityAudio;
    #regularAudio;
    #isRegularPlaying;
    #pendingPrioritySounds;
    #soundPlayTimeout;
    #MAX_SOUND_DURATION;
    #prioritySoundTimeout;
    #DEFAULT_PRIORITY_SOUND_TIMEOUT;
    #priorityTimeoutStartTime;
    #priorityTimeoutRemainingTime;
    #regularSoundEndedHandler;
    #regularSoundErrorHandler;

    /**
     * Создает новый аудио элемент
     */
    #createAudioElement() {
        const audio = new Audio();
        audio.preload = "auto";
        return audio;
    }

    /**
     * Настраивает слушатели для обычного аудио элемента
     */
    #setupRegularAudioListeners() {
        if (this.#regularAudio) {
            this.#removeRegularAudioListeners();
        } else {
            this.#regularAudio = this.#createAudioElement();
        }

        this.#regularAudio.addEventListener("ended", this.#regularSoundEndedHandler);
        this.#regularAudio.addEventListener("error", this.#regularSoundErrorHandler);
    }

    /**
     * Удаляет слушатели с обычного аудио элемента
     */
    #removeRegularAudioListeners() {
        if (this.#regularAudio) {
            this.#regularAudio.removeEventListener("ended", this.#regularSoundEndedHandler);
            this.#regularAudio.removeEventListener("error", this.#regularSoundErrorHandler);
        }
    }

    /**
     * Обработчик окончания обычного звука
     */
    #handleRegularSoundEnded() {
        console.debug("Regular sound ended naturally");
        this.#clearSoundPlayTimeout();
        this.#onRegularSoundEnded();
    }

    /**
     * Обработчик ошибки воспроизведения обычного звука
     */
    #handleRegularSoundError() {
        const error = this.#regularAudio?.error;
        console.error("Error playing regular sound", {
            code: error?.code,
            message: error?.message ?? "unknown error"
        });

        this.#clearSoundPlayTimeout();
        this.#onRegularSoundEnded();
    }

    /**
     * Очищает таймаут воспроизведения звука
     */
    #clearSoundPlayTimeout() {
        if (this.#soundPlayTimeout !== null) {
            clearTimeout(this.#soundPlayTimeout);
            this.#soundPlayTimeout = null;
        }
    }

    /**
     * Обработчик окончания обычного звука
     * Запускает следующий приоритетный звук из очереди, если есть
     */
    #onRegularSoundEnded() {
        this.#isRegularPlaying = false;

        // Если есть ожидающие приоритетные звуки, запускаем первый из очереди
        if (this.#pendingPrioritySounds.length > 0) {
            const nextPrioritySound = this.#pendingPrioritySounds.shift();
            if (nextPrioritySound) {
                const { reminderId, volume, src, timeoutDuration } = nextPrioritySound;
                this.playPrioritySound(reminderId, volume, src, timeoutDuration);
            }
        }
    }

    /**
     * Воспроизводит обычный звук (однократно)
     */
    playRegularSound(volume = 0.5, src = "audio/notification.mp3") {
        // Не воспроизводим, если играет приоритетный звук
        if (this.#activePriorityReminderIds.size > 0) {
            console.debug("Priority sound is playing, skipping regular sound");
            return;
        }

        // Не воспроизводим, если уже играет обычный звук
        if (this.#isRegularPlaying) {
            console.debug("Already playing a regular sound, skipping this one");
            return;
        }

        // Создаем аудио элемент, если его нет
        if (!this.#regularAudio) {
            this.#regularAudio = this.#createAudioElement();
            this.#setupRegularAudioListeners();
        }

        // Устанавливаем таймаут на случай, если звук зависнет
        this.#clearSoundPlayTimeout();
        this.#soundPlayTimeout = window.setTimeout(() => {
            console.debug("Sound play timeout reached, forcing completion");
            this.#onRegularSoundEnded();
        }, this.#MAX_SOUND_DURATION);

        console.debug("Attempting to play regular sound", { volume, src });

        // Настраиваем и запускаем воспроизведение
        this.#regularAudio.volume = volume;
        this.#regularAudio.src = src;
        this.#regularAudio.loop = false;
        this.#isRegularPlaying = true;
        this.#regularAudio.load();

        const playPromise = this.#regularAudio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.debug("Regular alarm sound playing", { volume });
                })
                .catch(error => {
                    console.error("Error playing regular sound", error);
                    this.#clearSoundPlayTimeout();
                    this.#onRegularSoundEnded();
                });
        }
    }

    /**
     * Сбрасывает таймаут приоритетного звука
     */
    #resetPrioritySoundTimeout(timeoutDuration = this.#DEFAULT_PRIORITY_SOUND_TIMEOUT) {
        this.#clearPrioritySoundTimeout();

        this.#priorityTimeoutStartTime = Date.now();
        this.#priorityTimeoutRemainingTime = timeoutDuration;

        this.#prioritySoundTimeout = window.setTimeout(() => {
            console.debug("Priority sound timeout reached, stopping all priority sounds");

            // Останавливаем все приоритетные звуки
            Array.from(this.#activePriorityReminderIds).forEach(reminderId => {
                this.stopPrioritySound(reminderId);
            });

            // Очищаем очередь
            this.#pendingPrioritySounds = [];
        }, timeoutDuration);

        console.debug("Set priority sound timeout", { timeoutDuration });
    }

    /**
     * Очищает таймаут приоритетного звука
     */
    #clearPrioritySoundTimeout() {
        if (this.#prioritySoundTimeout !== null) {
            clearTimeout(this.#prioritySoundTimeout);
            this.#prioritySoundTimeout = null;
        }
    }

    /**
     * Возвращает оставшееся время таймаута
     */
    #getRemainingTimeoutTime() {
        if (this.#prioritySoundTimeout === null) return 0;

        const elapsed = Date.now() - this.#priorityTimeoutStartTime;
        return Math.max(0, this.#priorityTimeoutRemainingTime - elapsed);
    }

    /**
     * Воспроизводит приоритетный звук (циклически)
     */
    playPrioritySound(reminderId, volume = 0.5, src = "audio/notification.mp3", timeoutDuration) {
        const duration = timeoutDuration || this.#DEFAULT_PRIORITY_SOUND_TIMEOUT;

        console.debug("Attempting to play priority sound", { reminderId, volume, src });

        // Если звук для этого напоминания уже играет, игнорируем
        if (this.#activePriorityReminderIds.has(reminderId)) {
            console.debug("Priority sound already playing", { reminderId });
            return;
        }

        // Если играет обычный звук, ставим приоритетный в очередь
        if (this.#isRegularPlaying) {
            console.debug("Regular sound playing, queueing priority sound", { reminderId });
            this.#pendingPrioritySounds.push({
                reminderId,
                volume,
                src,
                timeoutDuration: duration
            });
            return;
        }

        // Настраиваем таймаут для приоритетных звуков
        if (this.#activePriorityReminderIds.size === 0) {
            this.#resetPrioritySoundTimeout(duration);
        } else {
            const remainingTime = this.#getRemainingTimeoutTime();
            if (duration > remainingTime) {
                console.debug("Extending priority timeout", { from: remainingTime, to: duration });
                this.#resetPrioritySoundTimeout(duration);
            } else {
                console.debug("Keeping existing priority timeout", { remainingTime });
            }
        }

        // Добавляем напоминание в список активных
        this.#activePriorityReminderIds.add(reminderId);
        console.debug("Added reminder to active priority reminders", {
            reminderId,
            totalActive: this.#activePriorityReminderIds.size
        });

        // Если звук уже играет для другого напоминания, не прерываем
        if (this.#priorityAudio && this.#priorityAudio.src && !this.#priorityAudio.paused && this.#activePriorityReminderIds.size > 1) {
            console.debug("Priority sound already playing, keeping current playback", { reminderId });
            return;
        }

        // Создаем аудио элемент, если его нет
        if (!this.#priorityAudio) {
            this.#priorityAudio = this.#createAudioElement();
        }

        // Настраиваем и запускаем циклическое воспроизведение
        this.#priorityAudio.src = src;
        this.#priorityAudio.volume = volume;
        this.#priorityAudio.loop = true;
        this.#priorityAudio.load();

        const playPromise = this.#priorityAudio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.debug("Priority alarm sound playing", {
                        reminderId,
                        volume,
                        activeReminders: Array.from(this.#activePriorityReminderIds)
                    });
                })
                .catch(error => {
                    console.error("Error playing priority sound", error, { reminderId });

                    // Пытаемся пересоздать аудио элемент и повторить попытку через 1 секунду
                    setTimeout(() => {
                        if (this.#activePriorityReminderIds.has(reminderId)) {
                            console.debug("Retrying playback", { reminderId });

                            this.#priorityAudio = this.#createAudioElement();
                            this.#priorityAudio.src = src;
                            this.#priorityAudio.volume = volume;
                            this.#priorityAudio.loop = true;
                            this.#priorityAudio.load();

                            this.#priorityAudio.play().catch(retryError => {
                                console.error("Retry failed", retryError, { reminderId });
                            });
                        }
                    }, 1000);
                });
        }
    }

    /**
     * Останавливает приоритетный звук для конкретного напоминания
     */
    stopPrioritySound(reminderId) {
        const wasActive = this.#activePriorityReminderIds.delete(reminderId);

        // Удаляем из очереди, если есть
        this.#pendingPrioritySounds = this.#pendingPrioritySounds.filter(
            pending => pending.reminderId !== reminderId
        );

        if (wasActive) {
            console.debug("Removed reminder from active priority reminders", { reminderId });

            // Если больше нет активных напоминаний, останавливаем звук
            if (this.#activePriorityReminderIds.size === 0 && this.#priorityAudio) {
                try {
                    this.#priorityAudio.pause();
                    this.#priorityAudio.currentTime = 0;
                    this.#priorityAudio = this.#createAudioElement();

                    this.#clearPrioritySoundTimeout();
                    this.#priorityTimeoutStartTime = 0;
                    this.#priorityTimeoutRemainingTime = 0;

                    console.debug("All priority reminders dismissed, stopping sound playback");
                } catch (error) {
                    console.error("Error stopping priority sound", error);
                }
            } else {
                console.debug("Other priority reminders still active, continuing sound playback", {
                    activeCount: this.#activePriorityReminderIds.size
                });
            }
        } else {
            console.debug("Reminder was not in active priority reminders", { reminderId });
        }
    }

    /**
     * Останавливает обычный звук
     */
    stopRegularSound() {
        if (this.#regularAudio && this.#isRegularPlaying) {
            try {
                this.#regularAudio.pause();
                this.#regularAudio.currentTime = 0;

                // Пересоздаем аудио элемент для очистки состояния
                this.#removeRegularAudioListeners();
                this.#regularAudio = this.#createAudioElement();
                this.#setupRegularAudioListeners();

                this.#isRegularPlaying = false;
                this.#clearSoundPlayTimeout();

                console.debug("Regular sound stopped");

                // Если есть ожидающие приоритетные звуки, запускаем первый
                if (this.#pendingPrioritySounds.length > 0) {
                    const nextPriority = this.#pendingPrioritySounds.shift();
                    if (nextPriority) {
                        const { reminderId, volume, src, timeoutDuration } = nextPriority;
                        console.debug("Playing queued priority sound after stopping regular sound", { reminderId });
                        this.playPrioritySound(reminderId, volume, src, timeoutDuration);
                    }
                }
            } catch (error) {
                console.error("Error stopping regular sound", error);
            }
        }
    }

    /**
     * Останавливает все звуки
     */
    stopAllSounds() {
        // Останавливаем приоритетный звук
        if (this.#priorityAudio) {
            try {
                this.#priorityAudio.pause();
                this.#priorityAudio.currentTime = 0;
                this.#priorityAudio = this.#createAudioElement();
            } catch (error) {
                console.error("Error stopping priority sound", error);
            }
        }

        // Очищаем таймауты и состояние
        this.#clearPrioritySoundTimeout();
        this.#priorityTimeoutStartTime = 0;
        this.#priorityTimeoutRemainingTime = 0;
        this.#activePriorityReminderIds.clear();

        // Останавливаем обычный звук
        this.stopRegularSound();

        // Очищаем очередь
        this.#pendingPrioritySounds = [];

        console.debug("All sounds stopped");
    }

    /**
     * Очищает ресурсы перед закрытием
     */
    dispose() {
        this.#clearSoundPlayTimeout();
        this.#clearPrioritySoundTimeout();
        this.#priorityTimeoutStartTime = 0;
        this.#priorityTimeoutRemainingTime = 0;

        if (this.#regularAudio) {
            this.#removeRegularAudioListeners();
            this.#regularAudio.pause();
            this.#regularAudio = null;
        }

        if (this.#priorityAudio) {
            this.#priorityAudio.pause();
            this.#priorityAudio = null;
        }

        this.#activePriorityReminderIds.clear();
        this.#pendingPrioritySounds = [];
        this.#isRegularPlaying = false;
    }
}

// Создаем экземпляр менеджера звуков
const soundManager = new SoundManager();

// Настройка обработчика сообщений от расширения
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Игнорируем сообщения не для offscreen
    if (message.target !== "offscreen") return false;

    try {
        // Обрабатываем обычный звук
        if (message.type === "PLAY_ALARM_SOUND") {
            const { volume, soundFilePath } = message.data;
            soundManager.playRegularSound(volume, soundFilePath);
            sendResponse({ status: `Sound playing initiated with volume: ${volume}` });
        }
        // Обрабатываем приоритетный звук
        else if (message.type === "PLAY_PRIORITY_ALARM_SOUND") {
            const { reminderId, volume, soundFilePath, prioritySoundTimeout } = message.data;
            soundManager.playPrioritySound(reminderId, volume, soundFilePath, prioritySoundTimeout);
            sendResponse({ status: `Priority sound playing initiated for reminder ${reminderId} with volume: ${volume}` });
        }
        // Останавливаем приоритетный звук
        else if (message.type === "STOP_PRIORITY_ALARM_SOUND") {
            const { reminderId } = message.data;
            soundManager.stopPrioritySound(reminderId);
            sendResponse({ status: `Priority sound handling for reminder ${reminderId}` });
        }
        // Останавливаем обычный звук
        else if (message.type === "STOP_REGULAR_SOUND") {
            soundManager.stopRegularSound();
            sendResponse({ status: "Regular sound stopped" });
        }
        // Останавливаем все звуки
        else if (message.type === "STOP_ALL_SOUNDS") {
            soundManager.stopAllSounds();
            sendResponse({ status: "All sounds stopped" });
        }
    } catch (error) {
        console.error("Error handling message", error);
        sendResponse({ status: "Error", message: String(error) });
    }

    return true; // Асинхронный ответ
});

// Очищаем ресурсы при закрытии страницы
window.addEventListener("beforeunload", () => {
    soundManager.dispose();
});

console.debug("Offscreen document initialized for sound playback");