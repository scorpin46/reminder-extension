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
        <header>{{ browser.i18n.getMessage('Other') }}</header>
        <div>
          <div class="mb-15">
            <label class="form-label">
              <span class="form-label__title">
                {{ browser.i18n.getMessage('fastModeRun') }}
<!--                <IconInfo v-title="`Нажатие по плавающей иконке`" width="15" height="15" class="color-light cursor-help"/>-->
              </span>
              <select v-model="fastMode" class="form-control">
                <option value="text">{{ browser.i18n.getMessage('fastModeRunText') }}</option>
                <option value="voice">{{ browser.i18n.getMessage('fastModeRunVoice') }}</option>
                <option value="activeReminders">{{ browser.i18n.getMessage('fastModeRunActiveReminders') }}</option>
              </select>
            </label>
          </div>
<!--          <div class="mb-15">-->
<!--            <label class="form-check">-->
<!--              <span>Автоматически включать(клик) голосовую запись при добавлении</span>-->
<!--              <input type="checkbox">-->
<!--            </label>-->
<!--          </div>-->
<!--          <div class="mb-15">-->
<!--            &lt;!&ndash; todo на галочка очистки (и теоретиечского удаления должна быть активна)&ndash;&gt;-->
<!--            <label class="form-check">-->
<!--              <span>Режим автосохранения изменений (без подтверждения)</span>-->
<!--              <input type="checkbox">-->
<!--            </label>-->
<!--          </div>-->
        </div>
      </section>
      <section>
        <header>
          {{ browser.i18n.getMessage('hotkeys') }}
          <button @click="editHotkeys" v-if="isChrome" class="v-a-m ml-10" v-title="browser.i18n.getMessage('edit')">
            <IconPen height="15"/>
          </button>
        </header>
        <div>
          <div class="mb-5" v-for="hotkey in hotkeys">
            <b>{{ hotkey.shortcut }}</b> — {{ hotkey.description }}
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
import {getFastModeStore} from "@/modules/utils/storage.ts";
import { onMounted, ref, watch} from "vue";
import IconGoogle from "@/components/icons/IconGoogle.vue";
import IconOff from "@/components/icons/IconOff.vue";
import IconPen from "@/components/icons/IconPen.vue";

const props = defineProps({
  authenticatedEmail: {
    type: String,
  },
});

const emit = defineEmits(["close"]);
const fastMode = ref();

const hotkeys = ref([]);
const isChrome = navigator.userAgent.includes("Chrome");


const logout = () => {
  sendGoogleLogoutMessage()
}

const editHotkeys = () => {
  browser.runtime.sendMessage({ action : 'OPEN_HOTKEYS'}, async (response) => {
  });
}

const fastModeStore = getFastModeStore();

onMounted(async () => {
  fastMode.value = await fastModeStore.getValue();

  browser.commands.getAll((commands) => {
    commands.forEach((command) => {
      if (command.shortcut){
        hotkeys.value.push(command);
      }
    });
  });
})

watch(() => fastMode.value, async (value) => {
  await fastModeStore.setValue(value);

  browser.runtime.sendMessage({action: 'REINIT_FAB_FOR_CONTENT'});
})

</script>