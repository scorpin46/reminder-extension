<template>
  <div class="settings">
    <div class="settings__header">
      <div class="settings__title">Настройки</div>
      <span class="settings__close" role="button" @click="emit('close')" title="Закрыть">
        <IconXmark/>
      </span>
    </div>
    <div class="settings__body">
      <button @click="runGoogleAuth" v-if="!googleIsAuthenticatedEmail">Авторизоваться в гугл</button>
      <span v-else>авторизован , email: {{ googleIsAuthenticatedEmail}}</span>
    </div>
  </div>
</template>
<script setup>
import IconXmark from "@/components/icons/IconXmark.vue";
import {useToast} from "vue-toastification";
import {onMounted, ref} from "vue";

const props = defineProps({
});

const emit = defineEmits(["close"]);
const toast = useToast();
const allowGoogleAuth = ref(true); //брать из локал storage

const runGoogleAuth = () => {
  chrome.runtime.sendMessage({ type: 'loginToGoogle' }, (response) => {
    if (response.success) {
      toast.success(`Вы вошли как: ${response.email}`);
    } else {
      toast.error(`Не удалось авторизоваться`);
    }
  });
}

const googleIsAuthenticatedEmail = ref('');

const checkGoogleAuth = () => {
  if (allowGoogleAuth.value) {
    chrome.runtime.sendMessage({ type: 'checkAuth' }, (status) => {
      googleIsAuthenticatedEmail.value = status.isAuthed ? status.email : '';
    });   
  }
}

onMounted(() => {
  checkGoogleAuth()
})

</script>