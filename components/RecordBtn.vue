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

const toast = useToast();
const recognitionService = RecognitionService.instance();

const supportsRecording = ref(recognitionService.isSupported())

const recordClickHandler = () => {
  
  recognitionService.state.isRecording
      ? recognitionService.stop()
      : recognitionService.start()
          .catch((err) => {
            console.error(err);
            toast.error(browser.i18n.getMessage('noMicrophoneAccess'));
          })
}


onMounted(async () => {
  if (!supportsRecording.value) {
    toast.error(browser.i18n.getMessage('unsupportedSpeech'));
  }
});

</script>