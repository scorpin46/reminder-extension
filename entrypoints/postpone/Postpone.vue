<template>
  <div class="postpone">
    <div class="notranslate postpone__title">
      <b>{{ reminderItem.title }}</b>
<!--      todo детальное описание добавить потом-->
    </div>
    <div>
      <div v-for="option in reminderOptions" :key="option.minutes" class="postpone__option" @click="sendNewTime(option.targetDate)" role="button">
        <span>{{ option.label }}</span>
        <span v-if="option.labelUntil"> - {{ option.labelUntil }}</span>
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

const now = useNow({interval: 1000});
const inputDatetime = ref();
const reminderItem = ref({});
const minutes = ref([5, 10, 15, 30, 45, 60, 120, 240, 60 * 24]);
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
    let labelUntil;

    if (diffInDays === 0 || diffInDays === 1) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const dayStr = rtf.format(diffInDays === 0 ? 0 : 1, 'day');
      dateStr = dayStr.charAt(0).toUpperCase() + dayStr.slice(1) + ', ' + timeStr;
      if (targetDate.getDay() === new Date().getDay()){
        labelUntil = localTimeUntil(
            targetDate,
            locale,
            now.value,
        );
      }
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
      labelUntil: labelUntil,
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