<template>
  <div class="panel panel--editing">
    <div class="panel__title">
      {{ form.isCreating() ? browser.i18n.getMessage('addReminder') : browser.i18n.getMessage('editReminder') }}
    </div>
    <div class="panel__body">
      <label class="language-selector form-label w-100" v-if="isDev">
        <span class="form-label__title">{{ browser.i18n.getMessage('recognitionLanguage') }}</span>
        <select id="languageSelect" v-model="recognitionLocale" :disabled="recognitionService.state.isRecording">
          <option :value="locale" v-for="(lang, locale) in recognitionService.allowedLocaleLanguages">{{ lang }}</option>
        </select>
      </label>

      <div class="text-center">
        <RecordBtn class="my-20" :data-locale="recognitionLocale"/>
        <!--      todo для поддерживаемых языков chrono и microsoft добавить пример фразы с датой и временем-->
      </div>

      <form :class="{'result-section': true, '--saved': form.saved }" autocomplete="off" ref="formRef" @submit.prevent="form.save">
        <label class="form-label w-100 reminder-title__label">
          <span class="form-label__title">{{ recognitionService.state.streamRecordingText || browser.i18n.getMessage('reminderTitle')}}</span>
          <textarea required class="form-control reminder-title__input" v-model.trim="form.input.title" rows="1" ref="reminderTitleRef"></textarea>
        </label>
        <div class="w-100">
          <button v-if="!showExtraFields" @click="showExtraFields = true">+ {{ browser.i18n.getMessage('reminderAdvanced') }}</button>
          <div v-if="showExtraFields" ref="reminderDetailsRef">
            <label class="form-label w-100 reminder-title__label">
              <span class="form-label__title">{{ browser.i18n.getMessage('reminderDesc') }}</span>
              <textarea class="form-control w-100" v-model.trim="form.input.desc" rows="3"></textarea>
            </label>
            <label class="form-label w-100 reminder-title__label">
              <span class="form-label__title">URL</span>
              <input type="url" v-model="form.input.url" class="form-control w-100" placeholder="https://example.com">
            </label>
          </div>
        </div>
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
          
          <button type="button" class="reminder-cancel" @click="form.reset" :title="browser.i18n.getMessage('cancel')">
<!--            можно сделать двойной эффект при создании - сначала очистка, а второй клик отмена-->
            <IconCancel />
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
<script setup>
import {computed, onMounted, onUnmounted, reactive, ref, watch, nextTick} from "vue";
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
  backToPanel: {
    type: String,
  },
  editingInitialFormData: {
    type: Object,
    default: () => ({})
  },
  autostartRecording: {
    type: Boolean,
    default: false
  },
});

const isDev = import.meta.env.DEV;

const emit = defineEmits(["close"]);
const toast = useToast();
const reminderService = ReminderService.instance();
const recognitionService = RecognitionService.instance();

const reminderTitleRef = ref();
const reminderDetailsRef = ref();
const reminderDateRef = ref();
const recognitionLocale = ref();
const formRef = ref();
const showExtraFields = ref(false);

const formInputInitData = {
  id: null,
  title: '',
  url: null,
  datetime: null,
  desc: null,
};

const form = reactive({
  saved: false,
  input: formInputInitData,
  save: async function () {
    if (! formRef.value.reportValidity()){
      return
    }
    
    const id = await reminderService.save({...this.input});
    recognitionService.resetState();
    
    if (id){
      this.saved = true;
      
      setTimeout(() => {
        this.reset();
      }, 200)
    }
  },
  hasExtraFields: function(){
    return Object.keys(this.input).some(key => ! ['id', 'title', 'datetime'].includes(key) && this.input[key]);
  },
  reset: function ()  {
    this.saved = false;
    this.input = formInputInitData;

    emit('close');
  },
  isEmpty: function() {
    return ! Object.values(this.input).some(val => val?.length)
  },
  isCreating: function() {
    return !this.input.id;
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



watch(() => showExtraFields.value, async (value) => {
  await nextTick();
  
  if (value && reminderDetailsRef.value) {
    const fields = reminderDetailsRef.value.querySelectorAll('input,textarea');
    let focusingEl;

    fields.forEach(field => {
      if (field.value?.length) {
        focusingEl = field;
        return false;
      }
    })

    focusingEl ??= fields[0];
    focusingEl?.focus();
  }
})

onMounted(async () => {
  Object.assign(form.input, props.editingInitialFormData);
  reminderTitleRef.value?.focus();
  
  const locale = await recognitionService.localeStore.getValue();

  recognitionLocale.value = recognitionService.allowedLocaleLanguages[locale] 
      ? locale 
      : Object.keys(recognitionService.allowedLocaleLanguages).find(regLocale => regLocale.split('-')[0] === locale);
  recognitionLocale.value ??= 'en-US';

  watch(() => recognitionLocale.value, (value) => {
    recognitionService.changeLocale(value);
  });

  watch(() => recognitionService.state.parsedData, (value, oldValue) => {
    form.input.datetime = value?.date || form.input.datetime;
    form.input.title = value?.cleanText || form.input.title;
    reminderTitleRef.value?.focus();
  }, {
    deep: true,
    immediate: true,
  })

  watch(() => recognitionService.state.error, (value) => {
    value && toast.error(value);
  }, {immediate: true})

  if (form.isCreating() && form.hasExtraFields()){
    showExtraFields.value = true
  }
})

onUnmounted(() => {
  recognitionService.stop();
  recognitionService.resetState();
})

</script>