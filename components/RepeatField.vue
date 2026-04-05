<template>
  <div class="recurrence mb-5">
    <label class="form-label mb-15">
      <span class="form-label__title">Repeat</span>
      <select v-model="frequency" class="form-control">
        <option v-for="freq in frequencyOptions" :value="freq.value">{{ freq.label }}</option>
      </select>
    </label>

    <template v-if="isCustomFrequency">
      <div class="recurrence__unit">
<!--        todo переводы текстам сделать-->
        <span>Every</span>
        <input type="number" v-model.number="interval" min="1" class="form-control" required placeholder="1"/>
        <select v-model="intervalUnit" class="form-control w-50" required>
          <option v-for="unit in intervalUnits" :value="unit.value">{{ unit.label }}</option>
        </select>
      </div>
    </template>

    <div v-if="showTimeRange" class="recurrence__times mb-20">
      <span>From</span>
      <input type="time" v-model="fromTime" class="form-control" required/>
      <span>to</span>
      <input type="time" v-model="toTime" class="form-control" :min="fromTime" required/>
    </div>

    <div v-if="showWeekdays" class="recurrence__weekdays mb-20">
      <label v-for="day in weekdays" :key="day.value" class="recurrence__weekday">
        <input type="checkbox" v-model="selectedDays" :value="day.value" hidden :required="!selectedDays.length">
        <span>{{ day.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch, onMounted, nextTick} from 'vue'
import {RRule, Frequencies, Weekdays} from '@martinhipp/rrule'
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
const interval = ref(30)
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
    const aDate = dateAdapter.date(date);
    const isLastDayOfMonth = dateAdapter.isSameDay(aDate, dateAdapter.endOfMonth(aDate));

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const options = {
      freq: isCustomFrequency.value ? intervalUnit.value : frequency.value,
      interval: isCustomFrequency.value ? interval.value : 1,
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
    const { freq, interval: int, byweekday } = RRule.fromString(props.rrule);

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

    interval.value ??= 1;
    
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

watch([rrule, fromTime, toTime], ([rruleVal, fromTimeVal, toTimeVal]) => {
  emit('update:fromTime', showTimeRange.value ? fromTimeVal : null)
  emit('update:toTime', showTimeRange.value ? toTimeVal : null)
  emit('update:rrule', rruleVal || null)
})

</script>