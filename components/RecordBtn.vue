<template>
  <button 
      class="record-btn" 
      type="button" 
      @click="recordClickHandler" 
      :disabled="!supportsRecording" 
      :title="recordBtnTitle"
  >
    <IconMic />
  </button>
</template>

<script setup>
import IconMic from "@/components/icons/IconMic.vue";
import {useToast} from "vue-toastification";
import {computed, onMounted, ref} from "vue";
import {RecognitionService} from "@/modules/recognitionService.ts";
import {browser} from 'wxt/browser';
import {ReminderService} from "@/modules/reminderService.ts";
import {allowedDateParserLocales} from "@/modules/textParserProvider.ts";

const props = defineProps({
  autostart: {
    type: Boolean,
    default: false
  },
  isHeaderBtn: {
    type: Boolean,
    default: false
  },
});

const toast = useToast();
const recordBtnTitle = ref();
const recognitionService = RecognitionService.instance();
const reminderService = ReminderService.instance();
const supportsRecording = ref(recognitionService.isSupported())
const permissionDenied = ref(false)
const recognitionLocale = ref('')
const defaultTitle = computed(() => {
  const showExamples = props.isHeaderBtn && allowedDateParserLocales.includes(recognitionLocale.value?.split('-')[0]) && reminderService.repository.state.allCount < 10;
  let title = browser.i18n.getMessage('dictateNewReminder');
  
  return title + (showExamples ? `\n\n${browser.i18n.getMessage('dictateNewReminderExamples') }` : '')
});

recognitionService.localeStore.watch(locale => {
  recognitionLocale.value = locale;
})

const recordClickHandler = () => {
  recognitionService.state.isRecording
      ? recognitionService.stop()
      : recognitionService.start()
          .then(() => {
            recordBtnTitle.value = defaultTitle.value;
          })
          .catch((err) => {
            console.error(err);
            
            if (err.message.includes('Permission denied')){
              recognitionService.stop();
              
              let errCaption = browser.i18n.getMessage('noMicrophoneAccess') + '!';
              errCaption += `\n${browser.i18n.getMessage('clickForTroubleshooting')}`
             
              toast.error(errCaption, {
                timeout: 6000, 
                bodyClassName: 'cursor-pointer --smaller',
                onClick: () => {
                  window.location.hash = 'troubleshooting-microphone';
                }
              });
              
              permissionDenied.value = true;
              recordBtnTitle.value = errCaption;
            } else if (err.message.includes('recognition has already started')) {
              recognitionService.start();
            }
          })
}

onMounted(async () => {
  recognitionLocale.value = await recognitionService.localeStore.getValue();

  if (props.autostart) {
    recordClickHandler();
  }
  
  if (!supportsRecording.value) {
    toast.error(browser.i18n.getMessage('unsupportedSpeech'));
    recordBtnTitle.value = browser.i18n.getMessage('unsupportedSpeech');
  } else {
    recordBtnTitle.value = defaultTitle.value;
  }
});

</script>