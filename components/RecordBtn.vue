<template>
  <button 
      class="record-btn" 
      type="button" 
      @click="recordClickHandler" 
      :disabled="!supportsRecording" 
      :title="!supportsRecording ? browser.i18n.getMessage('unsupportedSpeech') : null"
  >
    <IconMic />
  </button>
</template>

<script setup>
import IconMic from "@/components/icons/IconMic.vue";
import {useToast} from "vue-toastification";
import {onMounted, ref} from "vue";
import {RecognitionService} from "@/modules/recognitionService.ts";
import {browser} from 'wxt/browser';

const props = defineProps({
  autostart: {
    type: Boolean,
    default: false
  },
});

const toast = useToast();
const recognitionService = RecognitionService.instance();

const supportsRecording = ref(recognitionService.isSupported())

const recordClickHandler = () => {
  recognitionService.state.isRecording
      ? recognitionService.stop()
      : recognitionService.start()
          .catch((err) => {
            console.error(err);

            if (err.message.includes('Permission denied')){
              toast.error(browser.i18n.getMessage('noMicrophoneAccess'));
              recognitionService.stop();
              //todo добавить ссылку на настройки, когда будет постоянный ID: chrome://settings/content/siteDetails?site=chrome-extension://oicbdedefebiabfolmlphmddhflnillb
              //todo хотя в яндексе по другому
            } else if (err.message.includes('recognition has already started')) {
              recognitionService.start();
            }
          })
}


onMounted(async () => {
  if (props.autostart) {
    recordClickHandler();
  }
  
  if (!supportsRecording.value) {
    toast.error(browser.i18n.getMessage('unsupportedSpeech'));
  }
});

</script>