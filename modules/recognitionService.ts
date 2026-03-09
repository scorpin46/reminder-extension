import {Reactive, reactive} from "vue";
import {TextParserProvider} from "./textParserProvider";
import type {TextParsedData} from "./textParserProvider";
import {getStoredLocale} from "./utils/storage";

export class RecognitionService {
    private recognition?: SpeechRecognition;
    private static _instance: RecognitionService;

    public readonly state: Reactive<{
        isRecording: boolean;
        streamRecordingText: string;
        recordedText: string;
        parsedData: TextParsedData | null;
        error: string|null;
    }>;

    private textParser?: TextParserProvider;
    private currentAudioStream?: MediaStream;
    public localeStore: ReturnType<typeof getStoredLocale>;

    constructor() {
        this.localeStore = getStoredLocale();

        this.state = reactive({
            isRecording: false,
            streamRecordingText: '',
            recordedText: '',
            parsedData: null,
            error: null
        });

        this.initRecognition();
    }

    static instance() {
        RecognitionService._instance ??= new RecognitionService();

        return RecognitionService._instance;
    }

    async initRecognition() {
        const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!speechRecognition) {
            return null;
        }

        const locale = await this.localeStore.getValue();

        this.textParser = new TextParserProvider(locale);

        const recognition = new speechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = locale;

        recognition.onstart = (event: object) => {
            console.log('onstart');

            this.state.parsedData = null;
            this.state.streamRecordingText = ''; // Сбрасываем при старте

            setTimeout(() => {
                this.state.isRecording = true;
            }, 200)
        }

        recognition.onend = (event: object) => {
            console.log('onend');

            this.state.isRecording = false;
            this.currentAudioStream?.getTracks().forEach(track => {
                track.stop(); //освобождение микрофона
            });
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.log('onerror');
            this.state.streamRecordingText = '';
            this.state.isRecording = false;

            let customError: string = event.error;

            if (event.error === 'no-speech') {
                customError = 'Не обнаружена речь. Попробуйте еще раз.';
            } else if (event.error === 'audio-capture') {
                customError = 'Микрофон не найден. Проверьте подключение.';
            } else if (event.error === 'not-allowed') {
                customError = 'Доступ к микрофону запрещен.';
            } else if (event.error === 'language-not-supported') {
                customError = `Язык (${recognition.lang}) не поддерживается, пробуем запасной...`;
            } else if (event.error === 'aborted') {
                customError = '';
            }

            this.state.error = customError;

            recognition.abort();
        }

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            console.log('onresult');
            let recordingText: string = '';
            
            // Проходим по всем новым результатам
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    // Финальный результат - заменяем весь текст
                    // (или можно добавить, если хочешь накапливать предложения)
                    this.state.streamRecordingText = transcript;

                    if (transcript) {
                        const parsedData = this.textParser!.parse(transcript);
                        this.state.parsedData = parsedData;
                        this.state.error = parsedData.error ?? this.state.error;
                        
                        // setTimeout(() => {
                            this.state.streamRecordingText = '';
                        // }, 1000)
                    }
                } else {
                    recordingText += transcript;
                }
            }

            this.state.streamRecordingText = recordingText;
        }

        // Остальные обработчики можно оставить как есть
        recognition.onaudioend = () => {
            console.log('onaudioend');
            this.state.isRecording = false;
        }

        recognition.onaudiostart = () => {console.log('onaudiostart')}
        recognition.onnomatch = () => {console.log('onnomatch')}
        recognition.onsoundend = () => {console.log('onsoundend')}
        recognition.onsoundstart = () => {console.log('onsoundstart')}
        recognition.onspeechend = () => {
            console.log('onspeechend');
        }
        recognition.onspeechstart = () => {console.log('onspeechstart')}

        this.recognition = recognition;
    }

    async start() {
        this.state.error = null;
        this.recognition?.abort();

        // Сбрасываем текст при новом старте
        this.state.streamRecordingText = '';

        this.currentAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: {
                    ideal: 16000,
                },
                channelCount: {
                    ideal: 1,
                    exact: 1
                },
                sampleSize: {
                    ideal: 16
                },
            }
        });

        this.recognition?.start();

        return this.currentAudioStream;
    }

    stop() {
        this.recognition?.stop();

        if (this.state.isRecording){
            this.recognition?.abort()
        }
    }

    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition) &&
            !!navigator?.mediaDevices?.getUserMedia;
    }

    resetState() {
        this.state.isRecording = false;
        this.state.streamRecordingText = '';
        this.state.recordedText = '';
        this.state.error = null;
        this.state.parsedData = null;
    }

    async changeLocale(locale: string) {
        await this.localeStore.setValue(locale);
        await this.initRecognition();
    }

    get allowedLocaleLanguages(): object {
        return {
            "ru-RU": "Русский",
            "en-US": "English",
            "es-ES": "Español",
            "fr-FR": "Français",
            "de-DE": "Deutsch",
            "it-IT": "Italiano",
            "pt-BR": "Português",
            "zh-CN": "中文",
            "ja-JP": "日本語",
        };
    }
}