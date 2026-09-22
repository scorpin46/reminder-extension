<template>
  <div class="postpone">
    <div :title="reminderService.getPreviewTitle(reminderItem, false)">
      <div class="notranslate postpone__title">
        <b>{{ reminderItem.title }}</b>
      </div>
      <div class="notranslate postpone__desc">{{ reminderItem.desc }}</div>
    </div>
    <hr class="mt-10">
    <div v-if="notificationMode" class="postpone__actions mt-10">
      <button class="postpone__toggle" @click="notificationMode = false">{{ browser.i18n.getMessage('alertPostponeBtn') }}</button>
      <button class="postpone__complete" @click="complete">{{ browser.i18n.getMessage('alertCompleteBtn') }}</button>
    </div>
    <div v-else>
      <div v-for="option in reminderOptions" :key="option.minutes" class="postpone__option" @click="sendNewTime(option.targetDate)" role="button">
        <span>{{ option.label }}</span>
        <span v-if="option.labelUntil"> — {{ option.labelUntil }}</span>
      </div>
      <div class="form-label mt-10 reminder-datetime-wrapper">
        <span class="form-label__title reminder-datetime">{{ browser.i18n.getMessage('customDate') }}</span>

        <div class="custom-time-input-wrapper">
          <InputDatetime v-model="inputDatetime" @change="changeCustomTime" class="form-control custom-time-input" :ref="ref => inputRef = ref.inputRef"/>
          <IconCheck class="date-confirm-icon" @click="changeCustomTime" v-if="inputDatetime"/>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import {ReminderService} from "@/modules/reminderService.js";
import {computed, onMounted, ref, watch} from "vue";
import {localTimeUntil} from "@/modules/utils/helpers.ts";
import InputDatetime from "@/components/InputDatetime.vue";
import {useNow} from "@vueuse/core";
import {browser} from "wxt/browser";
import IconCheck from "@/components/icons/IconCheck.vue";
import {useDarkMode} from "@/modules/composables/useDarkMode.ts";

useDarkMode();

const now = useNow({interval: 1000});
const inputDatetime = ref();
const inputRef = ref();
const reminderItem = ref({});
const notificationMode = ref();
const minutes = ref([5, 10, 15, 30, 45, 60, 120, 240, 60 * 24]);
const reminderService = ReminderService.instance();

const reminderOptions = computed(() => {
  const locale = reminderService.regionLocale;
  const nowDate = now.value;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }); // создаем один раз

  return minutes.value.map(min => {
    const targetDate = new Date(nowDate.getTime() + min * 60 * 1000);

    const isToday = targetDate.toDateString() === nowDate.toDateString();
    const isTomorrow = targetDate.toDateString() === new Date(nowDate.getTime() + 24*60*60*1000).toDateString();
    const diffInDays = Math.floor((targetDate - nowDate) / (1000 * 60 * 60 * 24));
    const diffInHours = (targetDate - nowDate) / (1000 * 60 * 60);

    const timeStr = targetDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    let dateStr;
    let labelUntil;

    if (isToday) {
      const dayStr = rtf.format(0, 'day');
      dateStr = dayStr.charAt(0).toLocaleUpperCase(locale) + dayStr.slice(1) + ', ' + timeStr;
      labelUntil = localTimeUntil(targetDate, locale, nowDate);
    }
    else if (isTomorrow) {
      const dayStr = rtf.format(1, 'day');
      dateStr = dayStr.charAt(0).toLocaleUpperCase(locale) + dayStr.slice(1) + ', ' + timeStr;
      
      if (diffInHours <= 23){
        labelUntil = localTimeUntil(targetDate, locale, nowDate);
      }
    }
    else {
      dateStr = targetDate.toLocaleString(locale, {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

  notificationMode.value = url.searchParams.get('notificationMode') === 'true';
})

const sendNewTime = async (value) => {
  if (value) {
    await reminderService.save(reminderItem.value.id, {datetime: value});
    window.close();
  }
}

const changeCustomTime = async () => {
  if (inputRef.value.reportValidity()) {
    sendNewTime(inputDatetime.value)
  }
}

const complete = async () => {
  await reminderService.complete(reminderItem.value.id);
  window.close();
}

</script>