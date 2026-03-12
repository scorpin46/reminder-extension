<template>
  <div class="postpone">
    <div class="notranslate postpone__title">
      <b>{{ reminderItem.title }}</b>
      <div class="postpone__desc" :title="reminderItem.desc">{{ reminderItem.desc }}</div>
    </div>
    <div>
      <div v-for="option in reminderOptions" :key="option.minutes" class="postpone__option" @click="sendNewTime(option.targetDate)" role="button">
        <span>{{ option.label }}</span>
        <span v-if="option.labelUntil"> - {{ option.labelUntil }}</span>
      </div>
      <label class="form-label w-100 mt-10 px-5">
        <span class="form-label__title">{{ browser.i18n.getMessage('customDate') }}</span>
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
  
  if (!reminderItem.value){
    console.error(`Reminder ${reminderId} not found`);
    window.close();
  }
})

const sendNewTime = async (value) => {
  if (value) {
    await reminderService.save(reminderItem.value.id, {datetime: value});
    window.close();
  }
}

</script>