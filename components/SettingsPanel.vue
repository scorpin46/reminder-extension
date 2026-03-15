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
      <IconSettings />
      {{ browser.i18n.getMessage('settings') }}
    </div>
    <div class="panel__body">
<!--      todo перевод-->
      <section>
        <header>Гугл-авторизация</header>
        <div>
          <button @click="sendGoogleLoginMessage()" v-if="!googleIsAuthenticatedEmail">Авторизоваться в гугл</button>
          <span v-else>авторизован , email: {{ googleIsAuthenticatedEmail}}</span>
        </div>
      </section>
      
      <section>
        <header>Прочие</header>
        <div>
          <div class="mb-15">
            <label class="form-check">
              <span>Автоматически включать(клик) голосовую запись при добавлении</span>
              <input type="checkbox">
            </label>
          </div>

          <div class="mb-15">
            <div>Вкладка по умолчанию (default tab)</div>
            <label class="form-check">
              <span>Add Reminder</span>
              <input type="checkbox">
              <span>Reminders</span>
            </label>
          </div>

          <div class="mb-15">
            <!-- todo на галочка очистки (и теоретиечского удаления должна быть активна)-->
            <label class="form-check">
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
import {browser} from 'wxt/browser';
import IconSettings from "@/components/icons/IconSettings.vue";
import {sendGoogleCheckStatusMessage, sendGoogleLoginMessage} from "@/modules/utils/auth.js";

const props = defineProps({
  isAuthenticated: {
    type: Boolean,
  },
});

const emit = defineEmits(["close"]);
const toast = useToast();
const googleIsAuthenticatedEmail = ref();

onMounted(async () => {
  sendGoogleCheckStatusMessage(response => {
    googleIsAuthenticatedEmail.value = response.user.email;
    
    if (!response.authenticated && response.message){
      toast.error(response.message, {timeout: 8000});
    }
  })
})

</script>