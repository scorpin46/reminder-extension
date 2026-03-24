<template>
  <div class="panel panel-settings">
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
    <div class="panel__body settings">
      <section>
        <header>Google Calendar</header>
        <div>
          <button
              v-if="!authenticatedEmail"
              class="google-auth-btn mt-5"
              @click="sendGoogleLoginMessage()"
          >
            <IconGoogle/>
            {{ browser.i18n.getMessage('signInWith', ['Google']) }}
          </button>
          <div v-else class="panel-settings__auth-data">
              <span>Email: <b>{{ authenticatedEmail}} </b></span>
              <button @click="logout" class="panel-settings__logout" v-title="browser.i18n.getMessage('syncOff')">
                <IconOff height="30" width="30"/>
              </button>
          </div>
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
import {browser} from 'wxt/browser';
import IconSettings from "@/components/icons/IconSettings.vue";
import { sendGoogleLoginMessage, sendGoogleLogoutMessage} from "@/modules/utils/auth.js";
import {getFabVoiceModeStore} from "@/modules/utils/storage.ts";
import {onMounted} from "vue";
import IconGoogleCalendar from "@/components/icons/IconGoogleCalendar.vue";
import IconGoogle from "@/components/icons/IconGoogle.vue";
import IconOff from "@/components/icons/IconOff.vue";

const props = defineProps({
  authenticatedEmail: {
    type: String,
  },
});

const emit = defineEmits(["close"]);

const logout = () => {
  sendGoogleLogoutMessage()
}

const fabVoiceModeStore = getFabVoiceModeStore();

fabVoiceModeStore.watch((newValue, oldValue) => {
  //todo Триггерить update иконки
  // fabVoiceModeStore.setValue(newValue)

  browser.runtime.sendMessage({ action: 'SAR__REINIT_FAB_FOR_CONTENT' });
})

</script>