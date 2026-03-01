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

const toast = useToast();
const reminderService = ReminderService.instance();

const supportsRecording = ref(reminderService.supportsRecording)

const recordClickHandler = () => {
  reminderService.isRecording
      ? reminderService.recordStop()
      : reminderService.recordStart()
          .catch((err) => {
            toast.error("Нет доступа к микрофону");
          })
}


onMounted(async () => {
  if (!reminderService.supportsRecording) {
    toast.error("Ваш браузер не поддерживает распознавание речи");
  }
});

</script>