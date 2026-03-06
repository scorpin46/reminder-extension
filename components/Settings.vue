<template>
  <div class="settings">
    <div class="settings__header">
      <div class="settings__title">Настройки</div>
      <span class="settings__close" role="button" @click="emit('close')" title="Закрыть">
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

// const googleIsAuthenticatedStore = getStoredGoogleIsAuthenticated();
// googleIsAuthenticatedStore.watch(async (newValue, oldValue) => {
//   toast.success("авторизация сломалась") //можно просто ждать sendMessage от bg и выводит ьв таком кейсе в любое время
// })


const checkGoogleAuth = () => {
  if (allowGoogleAuth.value) {
    browser.runtime.sendMessage({ action : 'googleCheckStatus' }, (response) => {
      console.log(response);
      googleIsAuthenticatedEmail.value = response.authenticated ? response.user.email : '';
    });   
  }
}

onMounted(async () => {
  allowGoogleAuth.value = await allowGoogleSyncStore.getValue();
  checkGoogleAuth()
})

</script>