import {browser} from "wxt/browser";
import {getSoundModeStore, getStoredLocale} from "@/modules/utils/storage.ts";

/**
 * Класс для управления offscreen документом и воспроизведением звуков
 */
export class OffscreenManager {
    constructor() {
        // Очередь задач для offscreen документа
        this.offscreenTasksQueue = [];
        // Флаг, указывающий, выполняется ли сейчас задача
        this.isProcessingOffscreenTask = false;
    }

    /**
     * Выполняет задачи из очереди последовательно
     */
    async executeOffscreenTasks() {
        // Если уже выполняется задача или очередь пуста, выходим
        if (this.isProcessingOffscreenTask || this.offscreenTasksQueue.length === 0) {
            return;
        }

        this.isProcessingOffscreenTask = true;
        const task = this.offscreenTasksQueue.shift();

        if (task) {
            try {
                await task();
            } catch (error) {
                console.error("Error executing offscreen task", error);
            } finally {
                this.isProcessingOffscreenTask = false;
                // Запускаем следующую задачу
                this.executeOffscreenTasks();
            }
        } else {
            this.isProcessingOffscreenTask = false;
        }
    }

    /**
     * Добавляет задачу в очередь для выполнения в offscreen документе
     */
    enqueueOffscreenTask(task) {
        this.offscreenTasksQueue.push(task);
        this.executeOffscreenTasks();
    }

    /**
     * Создает offscreen документ, если он еще не существует
     */
    async prepareOffscreenDocument(url = 'offscreen.html') {
        const fullUrl = browser.runtime.getURL(url);

        // Проверяем, существует ли уже offscreen документ
        const contexts = await browser.runtime.getContexts({
            contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT],
            documentUrls: [fullUrl]
        });

        // Если документ не существует, создаем его
        if (contexts.length === 0) {
            try {
                await browser.offscreen.createDocument({
                    url: url,
                    reasons: [browser.offscreen.Reason.AUDIO_PLAYBACK],
                    justification: "To play alarm sound without opening a visible window"
                });
                console.debug("Offscreen document for sound playback created successfully");
            } catch (error) {
                console.error("Error setting up Offscreen document for sound", error);
                throw error;
            }
        }
    }

    /**
     * Воспроизводит обычный звук будильника
     */
    async playAlarmSound() {
        this.enqueueOffscreenTask(async () => {
            try {
                // Подготавливаем offscreen документ
                await this.prepareOffscreenDocument();

                // Получаем настройки громкости и выбранного звука
                const [volumeSetting, selectedSound] = await Promise.all([
                    this.getVolume(),
                    this.getSelectedSound()
                ]);

                const volume = volumeSetting / 100; // Преобразуем проценты в десятичную дробь

                // Отправляем сообщение в offscreen документ
                browser.runtime.sendMessage({
                    type: "PLAY_ALARM_SOUND",
                    target: "offscreen",
                    data: {
                        volume: volume,
                        soundFilePath: selectedSound
                    }
                });

                console.debug("Alarm sound playback triggered in offscreen document");
            } catch (error) {
                console.error("Error triggering alarm sound", error);
            }
        });
    }

    /**
     * Останавливает обычный звук
     */
    async stopRegularSound() {
        this.enqueueOffscreenTask(async () => {
            try {
                await this.prepareOffscreenDocument();

                browser.runtime.sendMessage({
                    type: "STOP_REGULAR_SOUND",
                    target: "offscreen",
                    data: {}
                });

                console.debug("Regular sound stop requested");
            } catch (error) {
                console.error("Error stopping regular sound", error);
            }
        });
    }

    /**
     * Воспроизводит приоритетный звук (циклический) для важных напоминаний
     */
    async playPriorityAlarmSound(reminderId) {
        this.enqueueOffscreenTask(async () => {
            try {
                await this.prepareOffscreenDocument();

                // Получаем настройки
                const [volumeSetting, selectedSound, timeoutMinutes] = await Promise.all([
                    this.getVolume(),
                    this.getSelectedSound(),
                    this.getPrioritySoundTimeout()
                ]);

                const volume = volumeSetting / 100;
                const timeoutDuration = timeoutMinutes * 60 * 1000; // Преобразуем минуты в миллисекунды

                // Отправляем сообщение для воспроизведения приоритетного звука
                browser.runtime.sendMessage({
                    type: "PLAY_PRIORITY_ALARM_SOUND",
                    target: "offscreen",
                    data: {
                        reminderId: reminderId,
                        volume: volume,
                        soundFilePath: selectedSound,
                        prioritySoundTimeout: timeoutDuration
                    }
                });

                console.debug("Priority alarm sound playback triggered", { reminderId });
            } catch (error) {
                console.error("Error triggering priority alarm sound", error);
            }
        });
    }

    /**
     * Останавливает приоритетный звук для конкретного напоминания
     */
    async stopPriorityAlarmSound(reminderId) {
        if (!reminderId) {
            console.warn("Attempted to stop priority alarm with invalid reminderId");
            return;
        }

        this.enqueueOffscreenTask(async () => {
            try {
                await this.prepareOffscreenDocument();

                browser.runtime.sendMessage({
                    type: "STOP_PRIORITY_ALARM_SOUND",
                    target: "offscreen",
                    data: {
                        reminderId: reminderId
                    }
                });

                console.debug("Priority alarm sound stop requested", { reminderId });
            } catch (error) {
                console.error("Error stopping priority alarm sound", error);
            }
        });
    }

    /**
     * Получает сохраненную громкость звука
     */
    async getVolume() {
        return new Promise((resolve) => {
            browser.storage.sync.get(["volume"], (result) => {
                resolve(result.volume || 50); // По умолчанию 50%
            });
        });
    }

    /**
     * Получает выбранный файл звука
     */
    async getSelectedSound() {
        return new Promise((resolve) => {
            browser.storage.sync.get(["selectedSound"], (result) => {
                resolve(result.selectedSound || "audio/notification.mp3");
            });
        });
    }

    /**
     * Получает таймаут для приоритетного звука (в минутах)
     */
    async getPrioritySoundTimeout() {
        return new Promise((resolve) => {
            browser.storage.local.get(["prioritySoundTimeout"], (result) => {
                resolve(result.prioritySoundTimeout || 5); // По умолчанию 5 минут
            });
        });
    }
}