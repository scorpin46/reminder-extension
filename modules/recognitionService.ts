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
        recognition.maxAlternatives = 3;
        recognition.lang = locale;
        
        recognition.onstart = (event: object) => {
            console.log('onstart');

            this.state.parsedData = null;
            this.state.streamRecordingText = '';

            setTimeout(() => {
                this.state.isRecording = true;
            }, 200)
        }
        
        recognition.onend = (event: object) => {
            console.log('onend');

            this.state.isRecording = false;
            this.state.streamRecordingText = '';
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

            let lastTranscript = '';
            let maxConfidence = 0;

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const inFinal = event.results[i].isFinal;
                lastTranscript = event.results[i][0].transcript;

                if (inFinal) {
                    maxConfidence = Math.max(maxConfidence, event.results[i][0].confidence);

                    if (lastTranscript) {
                        const parsedData = this.textParser!.parse(lastTranscript);

                        this.state.parsedData = parsedData;
                        this.state.error = parsedData.error ?? this.state.error;
                    } else {
                        this.state.error = "Текст не распознан"
                    }
                }

                this.state.streamRecordingText = lastTranscript;
            }
        }

        recognition.onaudioend = () => {console.log('onaudioend')
            this.state.isRecording = false;
        }
        recognition.onaudiostart = () => {console.log('onaudiostart')}
        recognition.onend = () => {console.log('onend')}
        recognition.onnomatch = () => {console.log('onnomatch')}
        recognition.onsoundend = () => {console.log('onsoundend')}
        recognition.onsoundstart = () => {console.log('onsoundstart')}
        recognition.onspeechend = () => {
            console.log('onspeechend')
           
        }
        recognition.onspeechstart = () => {console.log('onspeechstart')}

        /**
         * soundstart
         * Срабатывает при обнаружении любого звука — будь то узнаваемая речь или нет.
         *
         * soundend
         * Срабатывает, когда перестаёт обнаруживаться какой-либо звук — будь то узнаваемая речь или нет.
         *
         * speechstart
         * Срабатывает при обнаружении звука, который служба распознавания речи распознает как речь.
         *
         * speechend
         * Срабатывает, когда перестаёт обнаруживаться речь, распознаваемая службой распознавания речи.
         *
         * start
         * Срабатывает, когда служба распознавания речи начинает прослушивать аудиосигнал для распознавания.
         */
        
        this.recognition = recognition;
    }

    async start() {
        this.state.error = null;
        this.recognition?.abort();

        this.currentAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
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