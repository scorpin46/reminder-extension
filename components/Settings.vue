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

const props = defineProps({
});

const emit = defineEmits(["close"]);
const toast = useToast();
const allowGoogleAuth = ref(true); //брать из локал storage

const runGoogleAuth = () => {
  browser.runtime.sendMessage({ action: 'googleLogin' }, (response) => {
    if (response.success) {
      toast.success(`Вы вошли как: ${response.email}`);
    } else {
      toast.error(`Не удалось авторизоваться`);
    }
  });
}

//todo где-то добавить оповещение, если вышли из аккаунта chrome

const googleIsAuthenticatedEmail = ref('');

const checkGoogleAuth = () => {
  if (allowGoogleAuth.value) {
    browser.runtime.sendMessage({ action : 'googleCheckStatus' }, (result) => {
      googleIsAuthenticatedEmail.value = result.authenticated ? result.user.email : '';
    });   
  }
}

onMounted(() => {
  checkGoogleAuth()
})

</script>