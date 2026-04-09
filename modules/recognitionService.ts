import {Reactive, reactive} from "vue";
import {TextParserProvider} from "./textParserProvider";
import type {TextParsedData} from "./textParserProvider";
import {getStoredLocale} from "./utils/storage";
import {browser} from 'wxt/browser';

export class RecognitionService {
    #recognition?: SpeechRecognition;
    #textParser?: TextParserProvider;
    #currentAudioStream?: MediaStream;

    static #instance: RecognitionService;

    readonly state: Reactive<{
        isRecording: boolean;
        streamRecordingText: string;
        recordedText: string;
        parsedData: TextParsedData | null;
        error: string|null;
    }>;

    readonly localeStore: ReturnType<typeof getStoredLocale>;

    #silenceTimer: NodeJS.Timeout|null = null;
    #streamRecordingFinalText: string = '';

    private constructor() {
        this.localeStore = getStoredLocale();

        this.state = reactive({
            isRecording: false,
            streamRecordingText: '',
            streamRecordingFinalText: '',
            recordedText: '',
            parsedData: null,
            error: null
        });

        this.#initRecognition();
    }

    static instance() {
        RecognitionService.#instance ??= new RecognitionService();

        return RecognitionService.#instance;
    }

    async #initRecognition() {
        const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!speechRecognition) {
            return null;
        }

        const locale = await this.localeStore.getValue();

        this.#textParser = new TextParserProvider(locale);

        const recognition = new speechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = locale;
        
        recognition.onstart = (event: object) => {
            console.log('onstart');

            this.state.parsedData = null;

            this.#streamRecordingFinalText = ''; // Сбрасываем при старте
            this.state.streamRecordingText = ''; // Сбрасываем при старте
            this.state.isRecording = true;
            this.#resetSilenceTimer(5000);
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.log('onerror');
            this.state.streamRecordingText = '';
            this.#streamRecordingFinalText = '';
            this.state.isRecording = false;
            this.#clearSilenceTimer();

            let customError: string = event.error;

            if (event.error === 'no-speech') {
                customError = browser.i18n.getMessage('errorNoSpeech');
            } else if (event.error === 'audio-capture') {
                customError = browser.i18n.getMessage('errorAudioCapture');
            } else if (event.error === 'not-allowed') {
                customError = browser.i18n.getMessage('errorNotAllowed');
            } else if (event.error === 'language-not-supported') {
                customError = browser.i18n.getMessage('errorLangIsNotSupport');
            } else if (event.error === 'aborted') {
                customError = '';
            }

            this.state.error = customError;

            this.stop();
        }

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            console.log('onresult');

            if (! event.results) {
                console.error('no speech results');

                return;
            }
            
            this.#resetSilenceTimer();

            let interimText = '';
            let localFinalText = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                let transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    localFinalText += transcript;
                } else {
                    interimText += transcript;
                }
            }
            
            this.#streamRecordingFinalText += ' ' + localFinalText;
            
            if (localFinalText){
                this.state.streamRecordingText = this.#streamRecordingFinalText;
            } else {
                this.state.streamRecordingText = this.#streamRecordingFinalText + ' ' +  interimText;
            }

            this.state.streamRecordingText = this.state.streamRecordingText.replace(/\s+/g, ' ').trim();
        }

        recognition.onend = (event: object) => {
            console.log('onend');

            this.state.isRecording = false;
            this.#currentAudioStream?.getTracks().forEach(track => {
                track.stop(); //освобождение микрофона
            });
            this.#clearSilenceTimer();

            this.state.streamRecordingText = this.#streamRecordingFinalText;
            this.state.parsedData = this.#textParser!.parse(this.#streamRecordingFinalText);
            this.state.error = this.state.parsedData.error ?? this.state.error;
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

        this.#recognition = recognition;
    }

    async start() {
        this.state.error = null;
        this.stop();
        
        this.state.streamRecordingText = '';
        this.#streamRecordingFinalText = '';
        // this.state.isRecording = true; //чтобы не создавать иллюзию, что запись уже идет

        this.#currentAudioStream = await navigator.mediaDevices.getUserMedia({
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

        
        try {
            this.#recognition?.start();    
        } catch (e){
            console.log(e);
        }

        return this.#currentAudioStream;
    }

    stop() {
        this.#recognition?.stop();
        this.#recognition?.abort();
        this.state.isRecording = false;
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
        await this.#initRecognition();
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

    #resetSilenceTimer(delay = 1500) {
        this.#clearSilenceTimer();
        this.#silenceTimer = setTimeout(() => {
            console.log(`Пауза ${delay} ms - останавливаю...`);
            this.stop();
        }, delay);
    }

    #clearSilenceTimer() {
        if (this.#silenceTimer) {
            clearTimeout(this.#silenceTimer);
            this.#silenceTimer = null;
        }
    }
}