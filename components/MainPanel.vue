<template>
  <div class="panel">
<!--    <label class="language-selector form-label w-100" v-if="isDev">-->
<!--      <span class="form-label__title">{{ browser.i18n.getMessage('recognitionLanguage') }}</span>-->
<!--      <select id="languageSelect" v-model="recognitionLocale" :disabled="recognitionService.state.isRecording">-->
<!--        <option :value="locale" v-for="(lang, locale) in recognitionService.allowedLocaleLanguages">{{ lang }}</option>-->
<!--      </select>-->
<!--    </label>-->

    <div class="text-center">
      <RecordBtn class="my-20" :data-locale="recognitionLocale"/>
    </div>

    <form :class="{'result-section': true, '--saved': form.saved }" autocomplete="off" ref="formRef" @submit.prevent="form.save">
      <label class="form-label w-100 reminder-title__label">
        <span class="form-label__title">{{ recognitionService.state.streamRecordingText || browser.i18n.getMessage('reminderTitle')}}</span>
        <textarea required class="form-control reminder-title__input" v-model.trim="form.input.title" rows="1" ref="reminderTitleRef"></textarea>
      </label>
      <br>
      <label class="form-label w-100">
        <span class="form-label__title">{{ form.input.datetime ? textDatetime : browser.i18n.getMessage('reminderDate') }}</span>

        <InputDatetime required ref="reminderDateRef" class="form-control w-100" v-model="form.input.datetime" />
      </label>
      <!--        <br>-->
      <!--        <label class="form-label w-100">-->
      <!--            <div>{{ browser.i18n.getMessage('reminderDetails') }}</div>-->
      <!--            <textarea class="form-control w-100" rows="2"></textarea>-->
      <!--        </label>-->
      <br>
      <br>
      <div class="reminder-buttons">
        <button type="submit" class="reminder-save" :disabled="recognitionService.state.isRecording || form.isEmpty()">
          <IconCheck />
        </button>
        <button v-if="!!editingId" type="button" class="reminder-cancel" @click="form.reset" title="Cancel">
          <IconCancel />
        </button>
        <button v-else type="button" class="reminder-reset" @click="form.reset" :disabled="recognitionService.state.isRecording || form.isEmpty()" title="Clear fields">
          <IconXmark />
        </button>
      </div>
    </form>

  </div>
</template>
<script setup>
import {computed, onMounted, onUnmounted, reactive, ref, watch, nextTick} from "vue";
import {pick} from "es-toolkit";
import {ReminderService} from "@/modules/reminderService.js";
import InputDatetime from "@/components/InputDatetime.vue";
import IconXmark from "@/components/icons/IconXmark.vue";
import IconCheck from "@/components/icons/IconCheck.vue";
import IconCancel from "@/components/icons/IconRevert.vue";
import {useToast} from "vue-toastification";
import RecordBtn from "@/components/RecordBtn.vue";
import {RecognitionService} from "@/modules/recognitionService.ts";
import {browser} from 'wxt/browser';

const props = defineProps({
  editingId: {
    type: [Number, String],
  },
  backToPanel: {
    type: String,
  },
});

let isDev = false;

try {
  isDev = import.meta.env.DEV;
} catch (e){}

const emit = defineEmits(["toPanel", "resetForm"]);
const toast = useToast();
const reminderService = ReminderService.instance();
const recognitionService = RecognitionService.instance();

const reminderTitleRef = ref();
const reminderDateRef = ref();
const recognitionLocale = ref();
const formRef = ref();

const form = reactive({
  saved: false,
  input: {
    id: null,
    title: '',
    datetime: null,
  },
  save: async function () {
    if (! formRef.value.reportValidity()){
      return
    }
    
    const id = await reminderService.saveReminder({...this.input});
    recognitionService.resetState();
    
    if (id){
      this.saved = true;
      
      setTimeout(() => {
        this.reset();
      }, props.editingId ? 0 : 800)
    }
  },
  load: async function(reminderId){
    const editingReminder = await reminderService.repository.getById(reminderId);
    Object.assign(this.input, pick(editingReminder, Object.keys(form.input)))
  },
  reset: function ()  {
    this.saved = false;
    this.input.id = null;
    this.input.title = '';
    this.input.datetime = null;

    if (props.backToPanel){
      emit('toPanel', props.backToPanel);
    }

    emit('resetForm');
  },
  isEmpty: function() {
    return ! Object.values(this.input).some(val => val?.length)
  }
})

// const defaultStatusText = 'Tap and say or type';

const textDatetime = computed(() => {
  return ! form.input.datetime
    ? null
    : new Date(form.input.datetime).toLocaleString(reminderService.regionLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
});

const initForm = async () => {
  if (!props.editingId) {
    form.input.datetime = recognitionService.state.parsedData?.date || null;
    form.input.title = recognitionService.state.parsedData?.cleanText || '';
  }

  await nextTick();
  if (form.input.title && !form.input.datetime) {
    // reminderDateRef.value.onFocus() //не вариант тк закрывает видимость
  } else {
    reminderTitleRef.value.focus();
  }
}

watch(() => recognitionService.state.parsedData, (value, oldValue) => {
  initForm();
}, {
  deep: true,
})

watch(() => props.editingId, (value, oldValue) => {
  if (value){
    form.load(value);
  } else if (oldValue) {
    form.reset();
  }
})

watch(() => recognitionService.state.error, (value) => {
  value && toast.error(value);
}, {immediate: true})

onMounted(async () => {
  initForm();

  const locale = await recognitionService.localeStore.getValue();

  recognitionLocale.value = recognitionService.allowedLocaleLanguages[locale] ? locale : Object.keys(recognitionService.allowedLocaleLanguages).find(regLocale => regLocale.split('-')[0] === locale);
  recognitionLocale.value ??= 'en-US';

  watch(() => recognitionLocale.value, (value) => {
    recognitionService.changeLocale(value);
  })
})

onUnmounted(() => {
  recognitionService.resetState()
})

</script>