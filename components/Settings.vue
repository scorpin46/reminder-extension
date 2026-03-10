<template>
  <div class="settings">
    <div class="settings__header">
      <div class="settings__title">{{ browser.i18n.getMessage('settings') }}</div>
      <span class="settings__close" role="button" @click="emit('close')" :title="browser.i18n.getMessage('close')">
        <IconXmark height="24"/>
      </span>
    </div>
    <div class="settings__body">
      <button @click="runGoogleAuth" v-if="!googleIsAuthenticatedEmail">Авторизоваться в гугл</button>
      <span v-else>авторизован , email: {{ googleIsAuthenticatedEmail}}</span>

      <br>
      <br>
      <br>

      <label class="switch">
        <span>Автоматически включать(клик) голосовую запись при добавлении</span>
        <input type="checkbox">
      </label>

      <div>Вкладка по умолчанию (default tab)</div>
      <label class="switch">
        <span>Add Reminder</span>
        <input type="checkbox">
        <span>Reminders</span>
      </label>

<!-- todo на галочка очистки (и теоретиечского удаления должна быть активна)-->
      <label class="switch">
        <span>Режим автосохранения изменений (без подтверждения)</span>
        <input type="checkbox">
      </label>
    </div>
  </div>
</template>
<script setup>
import IconXmark from "@/components/icons/IconXmark.vue";
import {useToast} from "vue-toastification";
import {onMounted, ref} from "vue";
import {
  getStoredAllowGoogleSync,
  getStoredGoogleIsAuthenticated,
  getStoredGoogleUser
} from "@/modules/utils/storage.ts";
import {browser} from 'wxt/browser';

const props = defineProps({
});

const emit = defineEmits(["close"]);
const toast = useToast();
const allowGoogleSyncStore = getStoredAllowGoogleSync();
const googleIsAuthenticatedEmail = ref();

const allowGoogleAuth = ref();

allowGoogleSyncStore.watch((newValue, oldValue) => {
  allowGoogleAuth.value = newValue;
})


const runGoogleAuth = () => {
  browser.runtime.sendMessage({ action: 'googleLogin' }, (response) => {
    if (response.success) {
      allowGoogleSyncStore.setValue(true);
      toast.success(`Вы вошли как: ${response.user.email}`);

      googleIsAuthenticatedEmail.value = response.user.email;
    } else {
      toast.error(`Не удалось авторизоваться`);
    }
  });
}

const checkGoogleAuth = () => {
  if (allowGoogleAuth.value) {
    browser.runtime.sendMessage({ action : 'googleCheckStatus' }, (response) => {
      googleIsAuthenticatedEmail.value = response.authenticated ? response.user.email : '';
    });   
  }
}

onMounted(async () => {
  allowGoogleAuth.value = await allowGoogleSyncStore.getValue();
  checkGoogleAuth()
})

getStoredGoogleIsAuthenticated().watch((newValue) => {
  checkGoogleAuth();
})

</script>