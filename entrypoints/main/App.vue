<template>
  <Header
      v-model:searchVisible="searchVisible"
      v-model:openedTab="openedTab"
      v-model:editingPanelVisible="editingPanelVisible"
      :hasExpired="hasHeaderExpired"
      @openCreatePanel="showEditPanel(null)"
      v-horizontal-wheel
  />
  <Search
      :class="{'--active': searchVisible}"
      v-model:filterQuery="filterQuery"
      :allowedDates="allowedDates"
      :minFilterDate="minFilterDate"
      :maxFilterDate="maxFilterDate"
      :searchVisible="searchVisible"
  />
  <main>
    <div class="reminders__empty" v-if="filterQuery && ! Object.keys(daysGroupsReminders).length">
      <IconLogo class="logo mb-20" :mode="'info'" width="40"/>
      <div><b>{{ browser.i18n.getMessage('noResults') }}</b></div>
      <div class="mt-15 color-light">
        {{ browser.i18n.getMessage('changeQuery') }} "{{ filterQuery }}"
      </div>
      <button class="reminders__empty-reset mt-20" @click="resetSearch">
        <IconXmark height="20" width="20"/>
        <span>
          {{ browser.i18n.getMessage('reset') }}
        </span>
      </button>
    </div>

    <div class="reminders__empty" v-else-if="!reminders.length">
      <IconLogo class="logo mb-20" :mode="openedTab === 'completed' ? 'clockWithEars' : 'info'" width="40"/>
      <div><b>{{ browser.i18n.getMessage('noReminders') }}</b></div>
      <div class="mt-15 color-light">
        {{ openedTab === 'completed' ? browser.i18n.getMessage('noRemindersCompletedHere') : browser.i18n.getMessage('noRemindersCreateNew') }}
      </div>
      <button class="reminders__empty-create mt-20" v-if="openedTab === 'active'" @click="bigBtnCreateHandler" :title="browser.i18n.getMessage('addNewReminder')">
        <IconPlus height="50" width="50"/>
      </button>
    </div>

    <div class="reminders">
      <div v-for="(group, dateString) in daysGroupsReminders" :key="dateString">
        <div class="reminders-day">
          <template v-if="dateString !== 'expired'">
            <span>{{ group.label }}</span>
            <span v-if="dateString !== 'paused'">{{ dateString }}</span>
          </template>
          <template v-else>
            <span class="reminders-day__expired" role="button" @click="expiredIsOpen = !expiredIsOpen" :title="browser.i18n.getMessage(expiredIsOpen ? 'hide' : 'show')">
              <IconEye height="14" class="mr-5" :isOpen="expiredIsOpen"/>
              {{ group.label }} <span> ({{ group.items.length }}) {{ expiredIsOpen ? '' : '...'}}</span>
            </span>
          </template>
        </div>

        <template v-if="dateString !== 'expired' || expiredIsOpen">
          <div v-for="(item, key) in group.items" :key="`${item.id}`"
               :class="{
                'reminders-item': true, 
                '--expired': expired.includes(item.id),
                '--completed': item.completed, 
                '--soon': soon.includes(item.id),
                '--paused': item.recurrence?.length && item.recurrencePause,
                '--recurrence': !!item.recurrence?.length,
             }"
               :id="`reminder-${item.id}`"
               @mouseenter="$event.target.title = $event.target.title || reminderService.getPreviewTitle(item, now)"
          >
            <div class="reminders-item__text-box">
              <div class="reminders-item__title notranslate">{{ item.title }}</div>
              <div class="reminders-item__desc notranslate">{{ item.url ? item.url : item.desc }}</div>
            </div>
            <div class="reminders-item__time-box">
              <div class="reminders-item__time"><span>{{ reminderService.getLocalTime(item, now) }}</span></div>

              <div class="reminders-item__day">
                <template v-if="item.recurrence?.length && item.recurrencePause">
                  <IconPause width="14" height="14" stroke="currentColor"/>
                  <span>{{ browser.i18n.getMessage('reminder_paused') }}</span>
                </template> 
                <template v-else>
                  <IconChecks v-if="item.completed" width="16" height="16"/>
                  <IconTimer v-else width="14" height="14"/>
                  <span>{{ reminderService.getTimeUntil(item, now) }}</span>
                </template> 
              </div>
            </div>

            <div class="reminders-item__actions" @click="showEditPanel(item)">
              <div class="reminders-item__actions-inner" @click.stop title=" ">
                <button class="reminders-item__action reminders-item__action--edit" :title="browser.i18n.getMessage('edit')" @click.stop="showEditPanel(item)">
                  <IconEdit/>
                </button>
                <button
                    v-if="!item.completed && item.recurrence?.length"
                    :class="['reminders-item__action', {'reminders-item__action--pause': !item.recurrencePause, 'reminders-item__action--resume': item.recurrencePause}]"
                    :title="item.recurrencePause ? browser.i18n.getMessage('reminder_action_unpause') : browser.i18n.getMessage('reminder_action_pause')"
                    @click.stop="reminderService.recurrencePauseToggle(item)"
                >
                  <IconPlay v-if="item.recurrencePause"/>
                  <IconPause v-else/>
                </button>
                <button
                    v-if="!item.completed && (!item.recurrencePause && (group.isToday || expired.includes(item.id)))"
                    class="reminders-item__action reminders-item__action--complete"
                    :title="browser.i18n.getMessage('complete')"
                    @click.stop="complete(item)"
                >
                  <IconCheck v-if="item.recurrence?.length" height="20" width="20"/>
                  <IconChecks v-else/>
                </button>
                <button v-else
                        class="reminders-item__action reminders-item__action--delete"
                        :title="browser.i18n.getMessage('delete')"
                        @click.stop="deleteItem(item)"
                >
                  <IconTrash/>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </main>

  <EditPanel
      v-if="editingPanelVisible"
      v-model:initialFormData="initialFormData"
      v-model:autostartRecording="autostartRecording"
      :authenticatedEmail="authenticatedEmail"
      @close="closeEditPanel"
  />

  <SettingsPanel
      v-if="settingsPanelVisible"
      :authenticatedEmail="authenticatedEmail"
      @close="settingsPanelVisible = false"
  />

  <Rating/>

  <footer class="footer" ref="footerRef" @mouseover="footerHover(true)" @mouseout="footerHover(false)">
    <button class="footer__settings-btn" @click="settingsPanelVisible = true">
      <IconSettings/>
      <span>{{ browser.i18n.getMessage('settings') }}</span>
    </button>
    
    <template v-if="authenticatedEmail !== undefined">
      <button
          v-if="!authenticatedEmail"
          class="google-auth-btn"
          @click="sendGoogleLoginMessage"
          v-show="false"
      >
        <IconGoogle/>
        {{ browser.i18n.getMessage('signInWith', ['Google']) }}
      </button>
      <button 
          v-else
          class="footer__connected-btn"
          v-title="browser.i18n.getMessage('providerConnected', ['Google Calendar']) + ` - ${authenticatedEmail}`" 
          @click="settingsPanelVisible = true"
      >
        <IconGoogleCalendar height="26"/> 
        <span>{{ browser.i18n.getMessage('providerConnected', ['']).trim() }}</span>
      </button>
<!--      <button class="footer__help-btn" v-title="browser.i18n.getMessage('help')" @click="">-->
<!--        <IconHelp height="26"/>-->
<!--      </button>-->
    </template>
  </footer>

</template>
<script setup>
import EditPanel from "@/components/EditPanel.vue";
import {ReminderService} from "@/modules/reminderService.js";
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import IconSettings from "@/components/icons/IconSettings.vue";
import {RecognitionService} from "@/modules/recognitionService.ts";
import {browser} from 'wxt/browser';
import {useToast} from "vue-toastification";
import {
  getBroadcastErrorStore,
  getFastModeStore, getShowExpiredItemsStore,
  getStoredGoogleIsAuthenticated,
  getStoredGoogleUser
} from "@/modules/utils/storage.ts";
import IconChecks from "@/components/icons/IconChecks.vue";
import IconTimer from "@/components/icons/IconTimer.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import {isNumeric, localDateFormat, reminderIdToAlarmName} from "@/modules/utils/helpers.ts";
import {useIntervalFn} from "@vueuse/core";
import {useDate} from "vuetify/framework";
import Header from "@/components/Header.vue";
import Search from "@/components/Search.vue";
import {max, min} from "es-toolkit/compat";
import IconTrash from "@/components/icons/IconTrash.vue";
import IconGoogle from "@/components/icons/IconGoogle.vue";
import {sendGoogleCheckStatusMessage, sendGoogleLoginMessage} from "@/modules/utils/auth.js";
import IconGoogleCalendar from "@/components/icons/IconGoogleCalendar.vue";
import IconLogo from "@/components/icons/IconLogo.vue";
import IconPlus from "@/components/icons/IconPlus.vue";
import IconXmark from "@/components/icons/IconXmark.vue";
import IconEye from "@/components/icons/IconEye.vue";
import {omitBy} from "es-toolkit";
import IconPause from "@/components/icons/IconPause.vue";
import IconPlay from "@/components/icons/IconPlay.vue";
import IconCheck from "@/components/icons/IconCheck.vue";
import Rating from "@/components/Rating.vue";

const props = defineProps({
  editingPanelVisible: {
    type: Boolean,
    default: false
  },
  openedTab: {
    type: String,
    default: "active"
  },
})

const reminderService = ReminderService.instance();
const recognitionService = RecognitionService.instance();

const footerRef = ref();
const settingsPanelVisible = ref(false);
const editingPanelVisible = ref(props.editingPanelVisible);
const openedTab = ref(props.openedTab);
const authenticatedEmail = ref();
const expiredIsOpen = ref(true);

const googleIsAuthenticatedStore = getStoredGoogleIsAuthenticated();
const broadcastErrorStore = getBroadcastErrorStore();
const googleUserStore = getStoredGoogleUser();
const fastModeStore = getFastModeStore();
const showExpiredItems = getShowExpiredItemsStore();

showExpiredItems.getValue().then((val) => {
  expiredIsOpen.value = val;
})

const checkAuth = async () => {
  sendGoogleCheckStatusMessage(async response => {
    await googleIsAuthenticatedStore.setValue(!!response.authenticated);
    authenticatedEmail.value = !response.authenticated ? '' : response?.user?.email || ''; //возвращать значение отличное от undefined!
  })
}

googleIsAuthenticatedStore.watch(async (newValue, oldValue) => {
  if (oldValue && !newValue) {
    authenticatedEmail.value = '';

    if (!await googleUserStore.getValue()) {
      toast.warning(browser.i18n.getMessage("successLogout"), {timeout: 3000, id: "successLogout"});
    }
  } else if (newValue && newValue !== oldValue) {
    checkAuth();
  }
});

const autostartRecording = ref(false);
const dateAdapter = useDate()
const toast = useToast();
const filterQuery = ref('');
const expired = ref([]);
const soon = ref([]);
const now = ref();
const SOON_MINUTES = 15;
const hasHeaderExpired = computed(() => {
  return !!reminderService.getExpiredReminders(now.value, true).length
})

const reminders = computed(() => reminderService.repository.state[openedTab.value] || []);
const daysGroupsReminders = computed(() => {
  const groups = {};

  reminders.value.forEach((item) => {
    let groupKey = item.datetime.toLocaleDateString(reminderService.regionLocale);
    const searchText = `${item.title} ${item.desc} ${item.url}`.toLocaleLowerCase();
    
    if (filterQuery.value 
        && !searchText.includes(filterQuery.value.toLocaleLowerCase())
        && groupKey !== filterQuery.value
    ) {
      return true;
    }

    let label = localDateFormat(item.datetime, false, reminderService.regionLocale, true);
    let isToday = dateAdapter.isSameDay(dateAdapter.date(now.value), dateAdapter.date(item.datetime));

    if (expired.value.includes(item.id)) {
      groupKey = 'expired';
      label = browser.i18n.getMessage('missed');
    }
    
    groups[groupKey] ??= {
      items: [],
      label: label,
      isToday: isToday 
    }

    const extendedItem = {...item};

    groups[groupKey].items.push(extendedItem);
  })
  
  return groups;
});

const showEditPanel = async (reminder = null, forceRunRecording = false) => {
  if (reminder) {
    initialFormData = isNumeric(reminder)
        ? await reminderService.repository.getById(reminder) || {}
        : reminder
    initialFormData ??= {}
  }
  
  autostartRecording.value = forceRunRecording;
  editingPanelVisible.value = true;
  
  await nextTick();
}

const closeEditPanel = async (data) => {
  editingPanelVisible.value = false;

  if (data?.savedId) {
    if (openedTab.value === 'completed' && data.isCreating) {
      openedTab.value = 'active';
    }
    
    setTimeout(async () => {
      await nextTick();
      const reminderEl = document.getElementById('reminder-' + data.savedId);

      reminderEl?.scrollIntoView({behavior: 'smooth', block: 'center'});
      reminderEl?.classList.add('--saved');
      reminderEl?.removeAttribute('title');

      setTimeout(() => {
        reminderEl?.classList.remove('--saved');
      }, 2000)
    }, 500)
  }
}

const actualize = () => {
  if (settingsPanelVisible.value || editingPanelVisible.value) {
    return;
  }
  // console.log('actualize');

  now.value = new Date();

  if (openedTab.value === 'active') {
    // console.log('expired and soon checking');

    expired.value = reminderService.getExpiredReminders(now.value).map(item => item.id);
    soon.value = reminderService.repository.state.active.filter(item => {
      const diff = item.datetime - now.value;
      return !item.completed && diff > 0 && diff < SOON_MINUTES * 60 * 1000
    }).map(item => item.id);
  }
}

const complete = (item) => {
  const el = document.getElementById('reminder-' + item.id);
  
  if (item.recurrence?.length && ! item.recurrencePause) {
    reminderService.toNextRecurrence(item);
  } else {
    el?.classList.add('--moving');

    setTimeout(() => {
      reminderService.complete(item);
      now.value = new Date();
    }, 300)
  }
}

const deleteItem = (item) => {
  document.getElementById('reminder-' + item.id)?.classList.add('--moving');

  setTimeout(() => {
    reminderService.delete(item);
  }, 300)
}

const searchVisible = ref(false);
const resetSearch = () => {
  filterQuery.value = '';
}

const allowedDates = computed(() => {
  const dates = (reminderService.repository.state[openedTab.value] || []).map(item => dateAdapter.toISO(item.datetime));
  return Array.from(new Set(dates))
});
const minFilterDate = computed(() => min(allowedDates.value));
const maxFilterDate = computed(() => max(allowedDates.value));


watch(() => reminderService.repository.state.isLoaded, (value) => {
  const interval = reminderService.repository.state.allCount > 200 ? 10000 : 5000;
  
  useIntervalFn(() => {
    actualize();
  }, interval, {immediateCallback: true})
}, {once: true})

watch(() => reminderService.repository.state.active, (value, oldValue) => {
  actualize();
  
  if (oldValue !== undefined && oldValue !== value){
    const menuItem = document.getElementById('menu-item-actual');

    if (menuItem) {
      menuItem.classList.add('--blink');

      setTimeout(() => {
        menuItem.classList.remove('--blink');
      }, 3000)
    }
  }
})

watch(() => searchVisible.value, (value, oldValue) => {
  if (!value) {
    resetSearch()
  }
})

watch(() => recognitionService.state.isRecording, (value, oldValue) => {
  document.documentElement.classList.toggle('--recording', value);
  
  // if (!value && oldValue && !recognitionService.state.streamRecordingText){
    //можно было бы notify "вас не слышно", но это не очень надежно здесь
  // }
})

watch([settingsPanelVisible, editingPanelVisible], ([settingsVisible, editingVisible], [settingsVisibleOld, editingVisibleOld]) => {
  if (!settingsVisible && !editingVisible) {
    actualize();
  }
})

watch(() => expiredIsOpen.value, (value) => {
  if (value != null){
    showExpiredItems.setValue(value);
  }
})

const bigBtnCreateHandler = (event) => {
  const btn = event.currentTarget;
  btn.classList.add('--clicked');
  
  setTimeout(() => {
    btn.classList.remove('--clicked');
    showEditPanel(null);
  }, 300)
}

let footerHoverTimeoutId;
const footerHover = (state) => {
  if (state){
    clearTimeout(footerHoverTimeoutId);
    footerRef.value.classList.add('--hovered')
  } else {
    footerHoverTimeoutId = setTimeout(() => {footerRef.value.classList.remove('--hovered')},1000)
  }
}

const url = new URL(window.location.href);
let initialFormData = omitBy(Object.fromEntries(url.searchParams.entries()), (value, key) => key.startsWith('__'));

onMounted(async () => {
  const fastMode = await fastModeStore.getValue();
  if (url.searchParams.has('__createByVoice')){
    autostartRecording.value = true;
  }
  
  if (fastMode === 'activeReminders'){
    openedTab.value = 'active';
  } else if (Object.keys(initialFormData).length) {
    const id = (+initialFormData.id || null); //нужно!
    await showEditPanel(id, fastMode === 'voice' || autostartRecording.value);

    url.search = '';

    window.history.replaceState(
        null,
        null,
        url.toString()
    );
  }
  
  broadcastErrorStore.watch((value, oldValue) => {
    if (value && value !== oldValue) {
      toast.error(value);
    }

    broadcastErrorStore.removeValue();
  })

  checkAuth();

  window.addEventListener('focus', () => actualize());
  window.addEventListener('hashchange', () => {
    if (window.location.hash.includes('troubleshooting')) {
      settingsPanelVisible.value = true;
    }
  });

  //пока убрал чтобы не перенагружать
  // watch(() => openedTab.value, (value, oldValue) => {
  //   actualize();
  // })
})
</script>