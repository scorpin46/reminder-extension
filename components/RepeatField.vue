<template>
  <div class="recurrence mb-15">
    <label class="form-label mb-15">
      <span class="form-label__title">Repeat</span>
      <select v-model="frequency" class="form-control">
        <option v-for="freq in frequencyOptions" :value="freq.value">{{ freq.label }}</option>
      </select>
    </label>

    <template v-if="isCustomFrequency">
      <div class="recurrence__unit">
        <span>Every</span>
        <input type="number" v-model.number="interval" min="1" class="form-control"/>
        <select v-model="intervalUnit" class="form-control w-50">
          <option v-for="unit in intervalUnits" :value="unit.value">{{ unit.label }}</option>
        </select>
      </div>
    </template>

    <div v-if="showTimeRange" class="recurrence__times mb-15">
      <span>From</span>
      <input type="time" v-model="fromTime" class="form-control" />
      <span>to</span>
      <input type="time" v-model="toTime" class="form-control" :min="fromTime" />
    </div>

    <div v-if="showWeekdays" class="weekdays mb-15">
      <label v-for="day in weekdays" :key="day.value">
        <input type="checkbox" v-model="selectedDays" :value="day.value">
        {{ day.label }}
      </label>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch, onMounted, nextTick} from 'vue'
import {RRule, Frequencies, Weekdays} from '@martinhipp/rrule'
import { CalendarDateTime } from '@internationalized/date'
import {useDate} from "vuetify/framework";

const props = defineProps({
  startDate: {
    type: Date, 
  },
  rrule: {
    type: String, 
    default: ''
  },
  fromTime: {
    type: String, 
  },
  toTime: {
    type: String, 
  },
})

const emit = defineEmits(['change', 'scrollToBottom', 'update:rrule', 'update:fromTime', 'update:toTime'])
const dateAdapter = useDate()

const frequency = ref('')
const interval = ref(1)
const intervalUnit = ref(Frequencies.MINUTELY)

const baseDate = computed(() => props.startDate instanceof Date && !isNaN(props.startDate.getTime())
    ? props.startDate
    : new Date()
)

const fromTime = ref(props.fromTime ?? '09:00');
const toTime = ref(props.toTime ?? '17:00')
const selectedDays = ref([Weekdays.MO, Weekdays.TU, Weekdays.WE, Weekdays.TH, Weekdays.FR])

const isCustomFrequency = computed(() => frequency.value === 'custom')

// Статика
const frequencyOptions = [
  { value: '', label: 'Never' },
  { value: Frequencies.DAILY, label: 'Every Day' },
  { value: Frequencies.WEEKLY, label: 'Every Week' },
  { value: Frequencies.MONTHLY, label: 'Every Month' },
  { value: Frequencies.YEARLY, label: 'Every Year' },
  { value: 'custom', label: 'Custom' }
]

const intervalUnits = [
  { value: Frequencies.MINUTELY, label: 'Minutes' },
  { value: Frequencies.HOURLY, label: 'Hours' },
  { value: Frequencies.DAILY, label: 'Days' },
  { value: Frequencies.WEEKLY, label: 'Weeks' },
  { value: Frequencies.MONTHLY, label: 'Months' },
  { value: Frequencies.YEARLY, label: 'Years' }
]

const rruleToMode = {
  [Frequencies.MINUTELY]: { freq: 'custom', unit: Frequencies.MINUTELY },
  [Frequencies.HOURLY]: { freq: 'custom', unit: Frequencies.HOURLY },
  [Frequencies.DAILY]: { freq: Frequencies.DAILY, unit: null },
  [Frequencies.WEEKLY]: { freq: Frequencies.WEEKLY, unit: null },
  [Frequencies.MONTHLY]: { freq: Frequencies.MONTHLY, unit: null },
  [Frequencies.YEARLY]: { freq: Frequencies.YEARLY, unit: null }
}

const weekdays = computed(() => {
  return dateAdapter.getWeekdays(0, 'short').map(weekday => ({
    label: weekday,
    value: weekday.toUpperCase().slice(0, 2),
  }))
})

const showTimeRange = computed(() => isCustomFrequency.value && [Frequencies.MINUTELY, Frequencies.HOURLY].includes(intervalUnit.value))
const showWeekdays = computed(() => isCustomFrequency.value && intervalUnit.value === Frequencies.WEEKLY)

const rrule = computed(() => {
  if (!frequency.value) return ''

  try {
    const date = baseDate.value;
    // const date = new Date('2026-04-30 15:30');
    const isLastDayOfMonth = dateAdapter.isSameDay(date, dateAdapter.endOfMonth(date));

    // const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // console.log(isLastDayOfMonth, date, dateAdapter.endOfMonth(date));
    // const [h, m] = fromTime.value.split(':').map(Number)
    // const dtstart = showTimeRange.value
    //     ? new CalendarDateTime(year, month, day, h, m)
    //     : new CalendarDateTime(year, month, day)

    const options = {
      freq: isCustomFrequency.value ? intervalUnit.value : frequency.value,
      interval: isCustomFrequency.value ? interval.value : 1,
      // dtstart
    }

    if (showWeekdays.value && selectedDays.value.length) {
      options.byweekday = selectedDays.value
    }

    if (frequency.value === Frequencies.MONTHLY || intervalUnit.value === Frequencies.MONTHLY) {
      options.bymonthday = [isLastDayOfMonth ? -1 : day]
    }

    if (frequency.value === Frequencies.YEARLY || intervalUnit.value === Frequencies.YEARLY) {
      options.bymonth = [month]; //todo протестить корректный ли месяц в гугл залетит
      options.bymonthday = [isLastDayOfMonth ? -1 : day]
    }

    return new RRule(options).toString()
  } catch (e) {
    console.error(e)
    return ''
  }
})

onMounted(() => {
  if (props.rrule){
    const { freq, interval: int, byweekday } = RRule.fromString(props.rrule).options
    const mode = rruleToMode[freq]

    if (mode) {
      if (int === 1 && !mode.unit) {
        frequency.value = mode.freq
      } else if (int > 1 || mode.unit) {
        frequency.value = 'custom'
        intervalUnit.value = mode.unit || mode.freq
        interval.value = int
      }
    }

    if (byweekday){
      selectedDays.value = byweekday.map(d => d.toString().toUpperCase())
    }
  }

  watch(isCustomFrequency, async (val) => {
    if (val) {
      await nextTick();
      emit('scrollToBottom')
    }
  })
})

watch(rrule, (val) => {
  console.log(val);
  emit('update:rrule', val || null)
  emit('update:fromTime', showTimeRange.value ? fromTime.value : null)
  emit('update:toTime', showTimeRange.value ? toTime.value : null)
})

</script>