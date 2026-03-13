<template>
  <div class="search">
    <IconSearch class="icon-search" v-if="!filterQuery.length"/>
    <IconXmark class="icon-close" v-else @click="filterQuery = ''"/>
    
    <input ref="inputRef" type="text" v-model.trim="filterQuery" class="form-control" :placeholder="browser.i18n.getMessage('searchPlaceholder')">
   
    <button
        class="search__calendar-btn"
        @click="calendarOpened = ! calendarOpened"
        :title="browser.i18n.getMessage('filterByDate')"
    ><IconCalendar/></button>

    <DatePicker
        class="search__date-picker"
        v-model="filterDate"
        v-if="calendarOpened"
        @close="calendarOpened = false"
        :allowedDates="allowedDates"
        :minFilterDate="minFilterDate"
        :maxFilterDate="maxFilterDate"
    />
  </div>
</template>

<script setup>
import DatePicker from "@/components/DatePicker.vue";
import IconCalendar from "@/components/icons/IconCalendar.vue";
import {ReminderService} from "@/modules/reminderService.ts";
import {computed, nextTick, ref, watch} from "vue";
import IconSearch from "@/components/icons/IconSearch.vue";
import IconXmark from "@/components/icons/IconXmark.vue";

const props = defineProps({
  filterQuery: {
    type: String,
    default: '',
  },
  allowedDates: {
    type: Array,
  },
  minFilterDate: {
    type: String,
  },
  maxFilterDate: {
    type: String,
  },
  searchVisible: {
    type: Boolean,
  },
})

const emit = defineEmits(['update:filterQuery']);
const reminderService = ReminderService.instance();
const calendarOpened = ref(false);

const filterQuery = computed({
  get: () => props.filterQuery,
  set: (value) => emit('update:filterQuery', value)
})

const filterDate = ref();
const inputRef = ref();

watch(() => filterDate.value, (value, oldValue) => {
  filterQuery.value = value ? value.toLocaleDateString(reminderService.regionLocale) : '';
})

watch(() => props.searchVisible, async (value, oldValue) => {
  if (value) {
    await nextTick()
    inputRef.value?.focus();
  }
})
</script>