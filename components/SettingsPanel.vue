<template>
  <div class="panel">
    <button
        class="panel__close"
        type="button"
        :title="browser.i18n.getMessage('close')"
        @click="emit('close')"
    >
      <IconXmark/>
    </button>
    
    <div class="panel__title">
      {{ browser.i18n.getMessage('settings') }}
    </div>
    <div class="panel__body">
<!--      todo перевод-->
      <section>
        <header>Гугл-авторизация</header>
        <div>
          <button @click="runGoogleAuth" v-if="!googleIsAuthenticatedEmail">Авторизоваться в гугл</button>
          <span v-else>авторизован , email: {{ googleIsAuthenticatedEmail}}</span>
        </div>
      </section>
      
      <section>
        <header>Прочие</header>
        <div>
          <div>
            <label class="switch">
              <span>Автоматически включать(клик) голосовую запись при добавлении</span>
              <input type="checkbox">
            </label>
          </div>

          <div>
            <div>Вкладка по умолчанию (default tab)</div>
            <label class="switch">
              <span>Add Reminder</span>
              <input type="checkbox">
              <span>Reminders</span>
            </label>
          </div>

          <div>
            <!-- todo на галочка очистки (и теоретиечского удаления должна быть активна)-->
            <label class="switch">
              <span>Режим автосохранения изменений (без подтверждения)</span>
              <input type="checkbox">
            </label>
          </div>
        </div>
      </section>
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
import IconPlus from "@/components/icons/IconPlus.vue";

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
  browser.runtime.sendMessage({ action: 'SAR__GOOGLE_LOGIN' }, (response) => {
    if (response.success) {
      allowGoogleSyncStore.setValue(true);
      toast.success(`Вы вошли как: ${response.user.email}`);      //todo перевод

      googleIsAuthenticatedEmail.value = response.user.email;
    } else {
      toast.error(browser.i18n.getMessage("errorAuth"), {timeout: 8000});
    }
  });
}

const checkGoogleAuth = () => {
  if (allowGoogleAuth.value) {
    browser.runtime.sendMessage({ action : 'SAR__GOOGLE_CHECK_STATUS' }, (response) => {
      console.log(response);
      googleIsAuthenticatedEmail.value = response.authenticated ? response.user.email : '';
      
      if (response.message){
        toast.error(response.message, {timeout: 8000});
      }
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