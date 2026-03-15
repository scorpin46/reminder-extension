<template>
  <div class="panel panel--editing">
    <div class="panel__title">
      {{ form.isCreating() ? browser.i18n.getMessage('addReminder') : browser.i18n.getMessage('editReminder') }}
    </div>
    <div class="panel__body">
   

      <div class="record-box">
<!--       <div>-->
<!--         <b>Тапни и произнеси что-то вроде:</b> <br>-->
<!--         "Завтра в 15:00 важная встреча с партнером"-->
<!--       </div>-->
        <div class="text-center">
          <RecordBtn  :data-locale="recognitionLocale"/>
        </div>
<!--        <label class="language-selector form-label">-->
<!--          <span class="form-label__title">{{ browser.i18n.getMessage('recognitionLanguage') }}</span>-->
<!--          <select id="languageSelect" v-model="recognitionLocale" :disabled="recognitionService.state.isRecording">-->
<!--            <option :value="locale" v-for="(lang, locale) in recognitionService.allowedLocaleLanguages">{{ lang }}</option>-->
<!--          </select>-->
<!--        </label>-->
      </div>

      <form :class="{'--saved': form.saved }" autocomplete="off" ref="formRef" @submit.prevent="form.save">
        <div class="main-fields">
          <div>
            <label class="form-label reminder-title">
              <span class="form-label__title">{{ browser.i18n.getMessage('reminderTitle')}}</span>
              <textarea required class="form-control" v-model.trim="form.input.title" rows="1" ref="reminderTitleRef"></textarea>
            </label>
            <label class="form-label">
              <span class="form-label__title reminder-datetime">{{ form.input.datetime ? textDatetime : browser.i18n.getMessage('reminderDate') }}</span>

              <InputDatetime required class="form-control w-100" v-model="form.input.datetime" />
            </label>
          </div>
<!--          <RecordBtn  :data-locale="recognitionLocale"/>-->
        </div>
        <div class="w-100">
          <button v-if="!showExtraFields" 
                  @click="showExtraFields = !showExtraFields" 
                  class="reminder-more-btn mb-10"
          >
            <span>{{ browser.i18n.getMessage('reminderAdvanced') }}</span>
            <IconDown />
          </button>
          <div v-show="showExtraFields" ref="reminderDetailsRef">
            <label class="form-label">
              <span class="form-label__title">{{ browser.i18n.getMessage('reminderDesc') }}</span>
              <textarea class="form-control w-100 reminder-desc" v-model.trim="form.input.desc" rows="3"></textarea>
            </label>
            <label class="form-label">
              <span class="form-label__title">URL</span>
              <input type="url" v-model="form.input.url" class="form-control w-100" placeholder="https://example.com">
            </label>
          </div>
        </div>
     
        <div class="reminder-buttons">
          <button type="button" class="reminder-cancel" @click="form.reset" :title="browser.i18n.getMessage('cancel')">
            <!--            можно сделать двойной эффект при создании - сначала очистка, а второй клик отмена-->
<!--            <IconCancel />-->
            <IconXmark />
          </button>
          <button type="submit" class="reminder-save" :disabled="recognitionService.state.isRecording">
            <IconCheck />
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
import IconPlus from "@/components/icons/IconPlus.vue";
import IconDown from "@/components/icons/IconDown.vue";

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

const emit = defineEmits(["close"]);
const toast = useToast();
const reminderService = ReminderService.instance();
const recognitionService = RecognitionService.instance();

const reminderTitleRef = ref();
const reminderDetailsRef = ref();
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
      this.saved = id;
      
      setTimeout(() => {
        this.reset();
      }, this.isCreating() ? 300 : 0)
    }
  },
  hasExtraFields: function(){
    return Object.keys(this.input).some(key => ! ['id', 'title', 'datetime'].includes(key) && this.input[key]);
  },
  reset: function ()  {
    emit('close', {savedId: this.saved});
    this.saved = false;
    this.input = formInputInitData;
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
  
  watch(() => recognitionService.state.streamRecordingText, (value) => {
    if (value){
      form.input.title = value;
    }
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