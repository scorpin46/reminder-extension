import {Reactive, reactive} from "vue";
import {TextParserProvider} from "./textParserProvider";
import type {TextParsedData} from "./textParserProvider";

export class RecognitionService {
    locale: string;
    private readonly recognition: SpeechRecognition | null;
    public readonly state: Reactive<{
        isRecording: boolean;
        streamRecordingText: string;
        recordedText: string;
        parsedData: TextParsedData | null;
        error: string|null;
    }>;
    
    private readonly textParser: TextParserProvider;

    constructor(locale: string) {
        this.locale = locale;
        this.recognition = this.initRecognition();
        this.textParser = new TextParserProvider(this.locale);

        this.state = reactive({
            isRecording: false,
            streamRecordingText: '',
            recordedText: '',
            parsedData: null,
            error: null
        });
    }

    initRecognition() {
        const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!speechRecognition) {
            return null;
        }

        const recognition = new speechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = this.locale;
        
        recognition.onstart = (event: object) => {
            this.state.parsedData = null;
            this.state.streamRecordingText = '';
            this.state.isRecording = true;
        }
        
        recognition.onend = (event: object) => {
            this.state.isRecording = false;
            this.state.streamRecordingText = '';
        }
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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
                customError = `Язык (${this.locale}) не поддерживается, пробуем запасной...`;
            }

            this.state.error = customError;
        }
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let lastTranscript = '';
            let maxConfidence = 0;

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const inFinal = event.results[i].isFinal;
                lastTranscript = event.results[i][0].transcript;

                if (inFinal) {
                    maxConfidence = Math.max(maxConfidence, event.results[i][0].confidence);

                    if (lastTranscript) {
                        const parsedData = this.textParser.parse(lastTranscript);

                        this.state.parsedData = parsedData;
                        this.state.error = parsedData.error ?? this.state.error;
                    } else {
                        this.state.error = "Текст не распознан"
                    }
                }

                this.state.streamRecordingText = lastTranscript;
            }
        }

        return recognition;
    }

    start() {
        this.state.error = null;
        
        return navigator.mediaDevices.getUserMedia({audio: true})
            .then(() => this.recognition?.start());
    }

    stop() {
        this.recognition?.stop();
    }

    updateLocale(locale: string) {
        if (this.recognition) {
            this.recognition.lang = locale;
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
}