<template>
  <button 
      class="record-btn" 
      type="button" 
      @click="recordClickHandler" 
      :disabled="!supportsRecording" 
      :title="!supportsRecording ? 'Ваш браузер не поддерживает распознавание речи' : null"
  >
    <IconMic />
  </button>
</template>

<script setup>
import IconMic from "@/components/icons/IconMic.vue";
import {ReminderService} from "@/modules/reminderService.js";
import {useToast} from "vue-toastification";
import {onMounted, ref} from "vue";
import {RecognitionService} from "@/modules/recognitionService.ts";

const toast = useToast();
const recognitionService = RecognitionService.instance();

const supportsRecording = ref(recognitionService.isSupported())

const recordClickHandler = () => {
  
  recognitionService.state.isRecording
      ? recognitionService.stop()
      : recognitionService.start()
          .catch((err) => {
            console.error(err);
            toast.error("Нет доступа к микрофону");
          })
}


onMounted(async () => {
  if (!supportsRecording.value) {
    toast.error("Ваш браузер не поддерживает распознавание речи");
  }
});

</script>