<template>
  <header class="header">
    <!--    <RecordBtn v-if="activePanel === 'reminders'" class="record-btn&#45;&#45;small"/>-->
    <!--    todo вернуть-->

    <button
        :class="{'header__add': true}"
        type="button"
        :title="browser.i18n.getMessage('addReminder')"
        @click="emit('openCreatePanel')"
    >
      <IconPlus/>
    </button>
    
    <div class="header__menu menu">
      <button 
          :class="{'menu__item': true, '--active': openedTab === 'active'}"
          :data-count="reminderService.repository.state.active.length"
          @click="openedTab = 'active'"
      >
        <template v-if="hasExpired">❗</template>
        <span>{{ browser.i18n.getMessage('actualTab') }}</span>
      </button>
      <button
          :class="{'menu__item': true, '--active': openedTab === 'complete'}"
          :data-count="reminderService.repository.state.completed.length"
          @click="openedTab = 'complete'"
      >
        <span>{{ browser.i18n.getMessage('completedTab') }}</span>
      </button>
    </div>

    <button type="button" class="header__search-btn" :title="browser.i18n.getMessage('search')" @click="searchOpened = !searchOpened">
      <IconSearch/>
    </button>
    
    <div v-if="searchOpened" class="header__search">
      <input type="text" v-model="filterQuery" >
          <DatePicker 
              class="" 
              v-model="filterDate" 
              v-if="calendarOpened"
              @close="calendarOpened = false"
              :allowedDates="allowedDates"
              :minFilterDate="minFilterDate"
              :maxFilterDate="maxFilterDate"
          />
          <span
              role="button"
              class="tab tab--calendar"
              @click="calendarOpened = ! calendarOpened"
              :title="browser.i18n.getMessage('filterByDate')"
              :data-selected="filterDate?.toLocaleDateString(reminderService.regionLocale)"
              v-if="filterDate || allowedDates.length > 0"
          >
           <IconCalendar/>
         </span>
    </div>
  </header>
</template>

<script setup>
import IconPlus from "@/components/icons/IconPlus.vue";
import IconSearch from "@/components/icons/IconSearch.vue";
import DatePicker from "@/components/DatePicker.vue";
import IconCalendar from "@/components/icons/IconCalendar.vue";
import {ReminderService} from "@/modules/reminderService.ts";
import {computed, ref, watch} from "vue";
import {max, min} from "es-toolkit/compat";
import {useDate} from "vuetify/framework";

const props = defineProps({
  openedTab: {
    type: String,
    default: "active"
  },
  filterQuery: {
    type: String,
  },
  filterDate: {
    type: String,
  },
  hasExpired: {
    type: Boolean,
  },
})

const emit = defineEmits(['openCreatePanel', 'update:openedTab', 'update:filterQuery', 'update:filterDate']);
const reminderService = ReminderService.instance();
const searchOpened = ref(false);
const dateAdapter = useDate()
const calendarOpened = ref(false);
const openedTab = computed({
  get: () => props.openedTab,
  set: (value) => emit('update:openedTab', value)
})

const filterQuery = computed({
  get: () => props.filterQuery ?? '',
  set: (value) => emit('update:filterQuery', value)
})

const filterDate = computed({
  get: () => props.filterDate ?? null,
  set: (value) => emit('update:filterDate', value)
})

//todo проверить сколько раз открытый календарь переинициализируется и в каких случаях
const allowedDates = computed(() => {
  return Array.from(
      new Set(reminderService.repository.state[openedTab.value].map(item => dateAdapter.toISO(item.datetime)))
  )
});
const minFilterDate = computed(() => min(allowedDates.value));
const maxFilterDate = computed(() => max(allowedDates.value));

const resetFilter = () => {
  filterDate.value = null;
  // searchInputRef.value.focus(); //todo когда будет поле
}
</script>