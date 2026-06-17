<template>
  <div class="panel panel-settings" ref="panelRef">
    <button
        class="panel__close"
        type="button"
        :title="browser.i18n.getMessage('close')"
        @click="emit('close')"
    >
      <IconXmark/>
    </button>

    <div class="panel__title">
      <IconSettings/>
      {{ browser.i18n.getMessage('settings') }}

      <span
          v-title="browser.i18n.getMessage('changeTheme')"
          class="theme-switcher" 
          role="button" 
          @click="darkModeStore.setValue(!isDarkMode)"
      >
        <svg v-if="!isDarkMode" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M10.9 1.667v2.5H9.1v-2.5zm0 14.166v2.5H9.1v-2.5zM4.744 3.471l1.768 1.768-1.273 1.273L3.47 4.744zM14.76 13.488l1.768 1.768-1.273 1.273-1.768-1.768zM4.167 9.1h-2.5v1.8h2.5zm14.166 0h-2.5v1.8h2.5zM3.471 15.256l1.768-1.768 1.273 1.273-1.768 1.768zM13.488 5.24l1.768-1.768 1.273 1.273-1.768 1.768zM6.8 10a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 0 0-6.4 0M5 10a5 5 0 1 0 10 0 5 5 0 0 0-10 0" clip-rule="evenodd"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="currentColor" d="m17.107 12.403.852.288.474-1.402-1.463.225.137.89Zm-9.51-9.51.89.137.224-1.463-1.403.474zm9.373 8.62q-.556.086-1.137.087v1.8q.72-.001 1.41-.107zm-1.137.087A7.433 7.433 0 0 1 8.4 4.167H6.6c0 5.1 4.134 9.233 9.233 9.233zM8.4 4.167q.001-.581.086-1.137l-1.779-.273q-.106.69-.107 1.41zM3.4 10a6.6 6.6 0 0 1 4.485-6.254L7.308 2.04A8.4 8.4 0 0 0 1.6 10zm6.6 6.6A6.6 6.6 0 0 1 3.4 10H1.6a8.4 8.4 0 0 0 8.4 8.4zm6.254-4.485A6.6 6.6 0 0 1 10 16.6v1.8c3.7 0 6.838-2.39 7.96-5.708z"/></svg>
      </span>
    </div>
    <div class="panel__body" ref="panelBodyRef">
      <section>
        <header>
          <span>Google Calendar </span>
          <IconExternalOpen height="14" class="ml-5" role="button" v-if="authenticatedEmail" v-title="browser.i18n.getMessage('open')" @click="openCalendar"/>
        </header>
        <div>
          <div v-if="!authenticatedEmail">
            <button
                class="google-auth-btn mt-5"
                @click="sendGoogleLoginMessage()"
            >
              <IconGoogle/>
              {{ browser.i18n.getMessage('signInWith', ['Google']) }}
            </button>
          </div>
          <div v-else>
            <div class="panel-settings__auth-data">
              <div>Email:  <b>{{ authenticatedEmail }}</b></div>
              <button @click="logout" class="panel-settings__logout" v-title="browser.i18n.getMessage('syncOff')">
                <IconOff height="26" width="30"/>
              </button>
            </div>
            <div class="panel-settings__auth-data mt-5" v-if="lastGoogleSync">
              <div>{{ browser.i18n.getMessage('lastSync') }}:  {{ new Date(lastGoogleSync).toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <header>{{ browser.i18n.getMessage('Other') }}</header>
        <div>
          <div class="mb-15">
            <label class="form-check">
              <input type="checkbox" v-model="defaultShowExtraFields">
              <span>{{ browser.i18n.getMessage('defaultShowExtraFields') }}</span>
            </label>
          </div>
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
          <!--            &lt;!&ndash; на галочка очистки (и теоретиечского удаления должна быть активна)&ndash;&gt;-->
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
          <button @click="openLink('chrome://extensions/shortcuts')" v-if="isChrome" class="v-a-m ml-10" v-title="browser.i18n.getMessage('edit')">
            <IconPen height="15"/>
          </button>
        </header>
        <div>
          <div class="" v-for="hotkey in hotkeys">
            <b>{{ hotkey.shortcut }}</b> — {{ hotkey.description }}
          </div>
        </div>
      </section>
      <section>
        <header>
          <IconWarning height="15"/>
          <span>{{ browser.i18n.getMessage('troubleshooting') }}</span>
        </header>
        <div class="faq-list">
          <template v-for="(faqItem) in faqItems" :key="faqItem.id">
            <div :class="['faq-item', {'--opened': faqItemOpenedId === faqItem.id}]">
              <div class="faq-item__title"
                   :title="browser.i18n.getMessage(faqItemOpenedId === faqItem.id ? 'close' : 'open')"
                   @click="faqTitleClick(faqItem.id)"
                   v-html="faqItem.title"
              ></div>
              <div class="faq-item__body">
                <template v-if="faqItem.id === 'notifications'">
                  <div class="mb-5">
                    <button @click="sendTestNotification" class="test-notify-btn">
                      <IconLogo :waves="true" :mode="'info'" height="18"/>
                      {{ testNotificationBtnText }}
                    </button>
                    <div class="color-red" v-if="testNotificationError">{{ testNotificationError }}</div>
                    <div class="color-green" v-else-if="testNotificationSuccess">{{ testNotificationSuccess }}</div>
                  </div>
                  <div>
                    <div class="mb-5 weight-bolder">{{ browser.i18n.getMessage('faq_notify_instructions') }}</div>
                    <div class="opacity-70">
                      <div class="color-primary mb-5" role="link" @click="openExtensionBrowserSettings">
                        <span class="v-a-m"> {{ browser.i18n.getMessage('faq_notify_extension_perm') }}  </span>
                        <IconExternalOpen height="12" class="v-a-m" v-title="browser.i18n.getMessage('open')"/>
                      </div>
                      <a class="color-primary mb-5" role="link" :href="getOsNotifySettingsLink()" target="_blank">
                        <span class="v-a-m" v-if="getOsNotifySettingsLink().startsWith('x-apple')">{{ browser.i18n.getMessage('faq_notify_step_macos') }}  </span>
                        <span class="v-a-m" v-else>{{ browser.i18n.getMessage('faq_notify_os_perm') }}  </span>
                        <IconExternalOpen height="12" class="v-a-m" v-title="browser.i18n.getMessage('open')"/>
                      </a>
                    </div>
                  </div>
                </template>
                <template v-else-if="faqItem.id === 'smartphone'">
                  <div class="opacity-70">
                    <div class="mb-5">{{ browser.i18n.getMessage('faq_mobile_stable_connection') }}</div>
                    <div class="mb-5">{{ browser.i18n.getMessage('faq_mobile_check_account') }}</div>
                    <div>{{ browser.i18n.getMessage('faq_mobile_power_save_mode_off') }}</div>
                  </div>
                </template>
                <template v-else-if="faqItem.id === 'microphone'">
                  <div class="opacity-70">
                    <div class="color-primary mb-5" role="link" @click="openExtensionBrowserSettings">
                      <span class="v-a-m"> {{ browser.i18n.getMessage('faq_mic_extension_perm') }}  </span>
                      <IconExternalOpen height="12" class="v-a-m" v-title="browser.i18n.getMessage('open')"/>
                    </div>
                    <a class="color-primary mb-5" role="link" :href="getOsMicSettingsLink()" target="_blank">
                      <span class="v-a-m"> {{ browser.i18n.getMessage('faq_mic_os_perm') }}  </span>
                      <IconExternalOpen height="12" class="v-a-m" v-title="browser.i18n.getMessage('open')"/>
                    </a>
                    <div class="color-primary mb-5" role="link" @click="openLink('chrome://settings/content/microphone')">
                      <span class="v-a-m"> {{ browser.i18n.getMessage('faq_mic_selecting') }}  </span>
                      <IconExternalOpen height="12" class="v-a-m" v-title="browser.i18n.getMessage('open')"/>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </section>
      <section>
        <header>
          <IconHelp height="15" :transparent="true"/> 
          <span>{{ browser.i18n.getMessage('help') }}</span>
        </header>
        <div role="link" @click="openLink(getImproveExperienceFormLink())">
          <IconMessage height="12" width="15" :transparent="true" class="v-a-m color-primary mr-5"/>

          <span class="v-a-m">{{ browser.i18n.getMessage('reportIssue') }}</span>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup>
import IconXmark from "@/components/icons/IconXmark.vue";
import {browser} from 'wxt/browser';
import IconSettings from "@/components/icons/IconSettings.vue";
import {sendGoogleLoginMessage, sendGoogleLogoutMessage} from "@/modules/utils/auth.js";
import {getDefaultShowExtraFieldsStore, getFastModeStore, getStoredGoogleLastSyncTs} from "@/modules/utils/storage.ts";
import {onMounted, onUnmounted, ref, watch} from "vue";
import IconGoogle from "@/components/icons/IconGoogle.vue";
import IconOff from "@/components/icons/IconOff.vue";
import IconPen from "@/components/icons/IconPen.vue";
import IconWarning from "@/components/icons/IconWarning.vue";
import IconHelp from "@/components/icons/IconHelp.vue";
import IconMessage from "@/components/icons/IconMessage.vue";
import IconExternalOpen from "@/components/icons/IconExternalOpen.vue";
import IconLogo from "@/components/icons/IconLogo.vue";
import {
  detectLocale,
  getImproveExperienceFormLink,
  getOsMicSettingsLink,
  getOsNotifySettingsLink, openLink
} from "@/modules/utils/helpers.ts";
import {useDarkMode} from "@/modules/composables/useDarkMode.ts";

const props = defineProps({
  authenticatedEmail: {
    type: String,
  },
});

const emit = defineEmits(["close"]);

const hotkeys = ref([]);
const isChrome = navigator.userAgent.includes("Chrome");
const {isDarkMode, darkModeStore} = useDarkMode();

const lastGoogleSync = ref();
const googleLastSyncStore = getStoredGoogleLastSyncTs();
googleLastSyncStore.watch((value) => {
  lastGoogleSync.value = value;
})

const defaultShowExtraFields = ref();
const defaultShowExtraFieldsStore = getDefaultShowExtraFieldsStore()

const fastMode = ref();
const fastModeStore = getFastModeStore();

const panelRef = ref();
const panelBodyRef = ref();
const faqItemOpenedId = ref();
const faqItems = [
  {
    id: 'microphone',
    title: browser.i18n.getMessage('faq_mic_failed') + " 🎙️",
  },
  {
    id: 'notifications',
    title: browser.i18n.getMessage('faq_no_notifications') + ' 🔔',
  },
  {
    id: 'smartphone',
    title: browser.i18n.getMessage('faq_no_mobile_sync') + ' 📲',
  },
];

const testNotificationBtnText = ref(browser.i18n.getMessage('test_notification'));
const testNotificationError = ref();
const testNotificationSuccess = ref();

const sendTestNotification = () => {
  testNotificationBtnText.value = browser.i18n.getMessage('test_notification_sending');

  browser.runtime.sendMessage({action: 'TEST_NOTIFICATION'}, (response) => {
    try {
      testNotificationBtnText.value = browser.i18n.getMessage('test_notification');

      if (!response.success) {
        testNotificationError.value = browser.i18n.getMessage('test_notification_error');
      } else {
        testNotificationSuccess.value = browser.i18n.getMessage('test_notification_success');
      }
    } catch (e) {
      console.error(e);
    }
  });
}

const faqTitleClick = (id) => {
  if (faqItemOpenedId.value === id) {
    faqItemOpenedId.value = null;
  } else {
    faqItemOpenedId.value = id;
  }
}

const logout = () => {
  sendGoogleLogoutMessage()
}

const openCalendar = () => {
  openLink(`https://calendar.google.com/calendar?authuser=${props.authenticatedEmail}`)
}

const openActivationInstruction = () => {
  const url = detectLocale().startsWith('ru') ? `https://set-a-reminder.github.io/sync-ru.html` : `https://set-a-reminder.github.io/sync.html`
  openLink(url)
}

const openExtensionBrowserSettings = () => {
  openLink(`chrome://settings/content/siteDetails?site=chrome-extension://${browser.runtime.id}`)
}

onMounted(async () => {
  fastMode.value = await fastModeStore.getValue();
  lastGoogleSync.value = await googleLastSyncStore.getValue();
  defaultShowExtraFields.value = await defaultShowExtraFieldsStore.getValue();

  browser.commands.getAll((commands) => {
    commands.forEach((command) => {
      if (command.shortcut) {
        hotkeys.value.push(command);
      }
    });
  });

  if (window.location.hash.startsWith('#troubleshooting')) {
    const foundFaqItem = faqItems.find((item) => item.id === window.location.hash.split('-')[1]);

    if (foundFaqItem) {
      faqItemOpenedId.value = foundFaqItem.id;

      setTimeout(() => {
        panelBodyRef.value?.scrollTo({
          top: 350,
          behavior: 'smooth'
        });
      }, 500)
    }
  }
})

watch(() => fastMode.value, async (value) => {
  await fastModeStore.setValue(value);

  browser.runtime.sendMessage({action: 'REINIT_FAB_FOR_CONTENT'});
})

watch(() => defaultShowExtraFields.value, async (value) => {
  await defaultShowExtraFieldsStore.setValue(value);
})

onUnmounted(() => {
  window.location.hash = '';
})

</script>