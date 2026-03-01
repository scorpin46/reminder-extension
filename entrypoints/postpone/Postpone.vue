<template>
  <div>
    <div class="notranslate">
      <b>{{ reminderItem.title }}</b>
    </div>
    <br>
    <div>
      <div v-for="option in reminderOptions" :key="option.minutes">
        <button type="button" @click="sendNewTime(option.targetDate)">
          <span>{{ option.label }}</span> -
          <span>{{ option.labelUntil }}</span>
        </button>
      </div>
      <br>
      <label class="form-label w-100">
        <span class="form-label__title">Choose Date & Time</span>
        <InputDatetime v-model="inputDatetime" @change="sendNewTime(inputDatetime)" class="form-control" />
      </label>
    </div>
  </div>
</template>
<script setup>
import {ReminderService} from "@/modules/reminderService.js";
import {computed, onMounted, ref, watch} from "vue";
import {localTimeUntil} from "@/modules/utils/helpers.ts";
import InputDatetime from "@/components/InputDatetime.vue";
import {useNow} from "@vueuse/core";

const now = useNow({interval: 60000});
const inputDatetime = ref();
const reminderItem = ref({});
const minutes = ref([5, 10, 15, 30, 45, 60, 120, 240]);
const reminderService = ReminderService.instance();

const reminderOptions = computed(() => {
  const locale = reminderService.regionLocale; //так даже лучше и правильнее во всяком случае в этом компоненте

  return minutes.value.map(min => {
    const targetDate = new Date(now.value.getTime() + min * 60 * 1000);
    const diffInDays = Math.round((targetDate - now.value) / (1000 * 60 * 60 * 24));

    // Форматируем время (одинаково для всех случаев)
    const timeStr = targetDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Форматируем дату в зависимости от diffInDays
    let dateStr;
    if (diffInDays === 0 || diffInDays === 1) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const dayStr = rtf.format(diffInDays === 0 ? 0 : 1, 'day');
      dateStr = dayStr.charAt(0).toUpperCase() + dayStr.slice(1) + ', ' + timeStr;
    } else {
      dateStr = targetDate.toLocaleString(locale, {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    return {
      minutes: min,
      labelUntil: localTimeUntil(
          targetDate,
          locale,
          now.value,
      ),
      label: dateStr,
      targetDate: targetDate
    };
  });
});

onMounted(async () => {
  const url = new URL(location.href);
  const reminderId = url.searchParams.get('id');
  reminderItem.value = await reminderService.repository.getById(reminderId);
})

const sendNewTime = async (value) => {
  if (value) {
    await reminderService.saveReminder({...reminderItem.value, datetime: value});
    window.close();
  }
}

</script>