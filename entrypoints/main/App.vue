<template>
  <Header
    v-model:openedTab="openedTab"
    v-model:filterQuery="filterQuery"
    v-model:filterDate="filterDate"
    :hasExpired="!!expired.length"
    @openCreatePanel="showEditPanel(null)"
  />
  <main>
    <EditPanel
        v-if="editingPanelVisible"
        :editingInitialFormData="editingInitialFormData"
        @close="editingPanelVisible = false"
    />

    <div v-if="filterQuery && ! Object.keys(daysGroupsReminders).length">
      <b>{{ browser.i18n.getMessage('noResults') }}</b>
      <div>
        {{ browser.i18n.getMessage('changeQuery') }} "{{ filterQuery }}"
      </div>

      <div>
        <button type="button">{{ browser.i18n.getMessage('reset') }}</button>
      </div>
    </div>
    
    <div v-else-if="!reminderService.repository.state.active.length">
      <!--      todo Добавить перевод и текст стилизовать -->
      Иконка + нет активных напоминаний + кнопка создать
    </div>
    
    <div class="reminders" >
      <div v-for="(group, dateString) in daysGroupsReminders" :key="dateString">
        <div class="reminders-day">
          <template v-if="dateString !== 'expired'">
            <span>{{ group.label }}</span>
            <span>{{ dateString }}</span>
          </template>
          <template v-else>
            <span class="color-red">
              {{ group.label }} <span> ({{ group.items.length }})</span>
              <!--              {{ group.label }} <span class="danger-label ml-5">{{ group.items.length }}</span>-->
            </span>
          </template>
        </div>

        <div v-for="(item, key) in group.items" :key="`${item.id}`"
             :class="{
                'reminders-item': true, 
                '--expired': expired.includes(item.id),
                '--completed': item.completed, 
                '--soon': soon.includes(item.id),
             }"
             :id="`reminder-${item.id}`"
             :title="item.previewTitle"
        >
          <div class="reminders-item__title notranslate">{{ item.title }}</div>
          <div class="reminders-item__time-box">
            <div class="reminders-item__time">{{ item.localTime }}</div>

            <div class="reminders-item__day">
              <IconTimer width="14" height="14"/>
              <span>{{ item.timeUntil }}</span>
              <IconChecks v-if="item.completed" width="16" height="16"/>
            </div>
          </div>

          <div class="reminders-item__actions" @click="showEditPanel(item)">
            <span role="button" class="reminders-item__edit" :title="browser.i18n.getMessage('edit')" @click.stop="showEditPanel(item)">
              <IconEdit/>
            </span>
            <span role="button" v-if="!item.completed" class="reminders-item__complete" :title="browser.i18n.getMessage('complete')" @click.stop="complete(item)">
              <IconChecks/>
            </span>
            <span role="button" v-if="item.completed" class="reminders-item__delete" :title="browser.i18n.getMessage('delete')" @click.stop="reminderService.delete(item)">
              <IconXmark/>
            </span>
          </div>
        </div>
      </div>
    </div>
  </main>

  <Settings v-if="settingsPanelVisible" @close="settingsPanelVisible = false"/>

  <footer>
    <button class="settings-btn" @click="settingsPanelVisible = true">
      <IconSettings/>
      <span>{{ browser.i18n.getMessage('settings') }}</span>
    </button>
  </footer>

</template>
<script setup>
import EditPanel from "@/components/EditPanel.vue";
import {ReminderService} from "@/modules/reminderService.js";
import {computed, nextTick, onMounted, reactive, ref, watch} from "vue";
import RecordBtn from "@/components/RecordBtn.vue";
import Settings from "@/components/Settings.vue";
import IconSettings from "@/components/icons/IconSettings.vue";
import {RecognitionService} from "@/modules/recognitionService.ts";
import {browser} from 'wxt/browser';
import {useToast} from "vue-toastification";
import {getBroadcastErrorStore} from "@/modules/utils/storage.ts";
import IconXmark from "@/components/icons/IconXmark.vue";
import IconChecks from "@/components/icons/IconChecks.vue";
import IconTimer from "@/components/icons/IconTimer.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import {localDateFormat} from "@/modules/utils/helpers.ts";
import {useIntervalFn} from "@vueuse/core";
import {useDate} from "vuetify/framework";
import Header from "@/components/Header.vue";

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

const settingsPanelVisible = ref(false);
const editingPanelVisible = ref(props.editingPanelVisible);
const openedTab = ref(props.openedTab);

const dateAdapter = useDate()
const toast = useToast();
const filterDate = ref();
const filterQuery = ref('');
const expired = ref([]);
const soon = ref([]);
const now = ref();
const SOON_MINUTES = 10;

const reminders = computed(() => reminderService.repository.state[openedTab.value] || []);
const daysGroupsReminders = computed(() => {
  const groups = {};

  reminders.value.forEach((item) => {
    if (filterDate.value && ! dateAdapter.isSameDay(item.datetime, filterDate.value)){
      return true;
    }

    if (!filterDate.value && filterQuery.value && ! `${item.title} ${item.desc}`.includes(filterQuery.value)){
      return true;
    }

    let groupKey = item.datetime.toLocaleDateString(reminderService.regionLocale);
    let label = localDateFormat(item.datetime, false, reminderService.regionLocale, true)

    if (expired.value.includes(item.id)){
      groupKey = 'expired';
      label = browser.i18n.getMessage('missed')
    }

    groups[groupKey] ??= {
      items: [],
      label: label
    }

    const extendedItem = {...item};

    extendedItem.previewTitle = reminderService.getPreviewTitle(item, now.value);
    extendedItem.timeUntil = reminderService.getTimeUntil(item, now.value);
    extendedItem.localTime = reminderService.getLocalTime(item, now.value)

    groups[groupKey].items.push(extendedItem);
  })

  return groups;
});

const showEditPanel = async (id = null) => {
  if (id){
    editingInitialFormData = await reminderService.repository.getById(id) || {}
  }

  editingPanelVisible.value = true;
}

const actualize = () => {
  now.value = new Date();
  expired.value = reminderService.repository.state.active.filter(item => !item.completed && item.datetime < now.value).map(item => item.id);
  soon.value = reminderService.repository.state.active.filter(item => {
    const diff = item.datetime - now.value;
    return !item.completed && diff > 0 && diff < SOON_MINUTES * 60 * 1000
  }).map(item => item.id);
}

const complete = (item) => {
  reminderService.complete(item);
  now.value = new Date();
}

useIntervalFn(() => {
    actualize();
}, 5000, {
  immediateCallback: true
})

watch(() => reminderService.repository.state.active, (value, oldValue) => {
  actualize();
})

watch(() => filterDate.value, (value, oldValue) => {
  filterQuery.value = value;
})

watch(() => recognitionService.state.isRecording, (value, oldValue) => {
  document.documentElement.classList.toggle('--recording', value);
})

const url = new URL(window.location.href);
let editingInitialFormData = Object.fromEntries(url.searchParams.entries());

onMounted(() => {
  if (Object.keys(editingInitialFormData).length) {
    showEditPanel(null);

    url.search = '';
    editingInitialFormData = {};

    window.history.replaceState(
        null,
        null,
        url.toString()
    );
  }

  getBroadcastErrorStore().watch((value, oldValue) => {
    if (value && value !== oldValue){
      toast.error(value)
    }
  })
})
</script>