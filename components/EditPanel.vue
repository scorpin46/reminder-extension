<template>
  <div class="panel panel-editing">
    <div class="panel__title">
      <template v-if="form.isCreating()">{{ browser.i18n.getMessage('addReminderTitle')}}</template>
      <template v-else>
        {{ browser.i18n.getMessage('editReminderTitle')}}
      </template>
    </div>
    <div class="panel__body" ref="panelBodyRef">
      <div class="record-box">
<!--       <div>-->
<!--         <b>Тапни и произнеси что-то вроде:</b> <br>-->
<!--         "Завтра в 15:00 важная встреча с партнером"-->
<!--       </div>-->
        <div class="text-center">
          <RecordBtn :data-locale="recognitionLocale" :autostart="autostartRecording"/>
        </div>
<!--        <label class="language-selector form-label">-->
<!--          <span class="form-label__title">{{ browser.i18n.getMessage('recognitionLanguage') }}</span>-->
<!--          <select id="languageSelect" v-model="recognitionLocale" :disabled="recognitionService.state.isRecording">-->
<!--            <option :value="locale" v-for="(lang, locale) in recognitionService.allowedLocaleLanguages">{{ lang }}</option>-->
<!--          </select>-->
<!--        </label>-->
      </div>

      <form :class="{'--saved': form.saved }" autocomplete="off" ref="formRef" @submit.prevent="form.save">
        <label class="form-label mb-15 reminder-title">
          <span class="form-label__title">{{ browser.i18n.getMessage('reminderTitle')}}</span>
          <textarea required class="form-control" v-model.trim="form.input.title" rows="1" ref="reminderTitleRef" maxlength="200"></textarea>
        </label>
        <label class="form-label mb-15" v-show="showExtraFields" v-if="!form.input.url">
          <span class="form-label__title">{{ browser.i18n.getMessage('reminderDesc') }}</span>
          <textarea class="form-control w-100 reminder-desc" v-model.trim="form.input.desc" rows="3" maxlength="1000"></textarea>
        </label>
        <div class="form-label mb-15 reminder-datetime-wrapper">
          <span class="form-label__title reminder-datetime">{{ form.input.datetime ? textDatetime : browser.i18n.getMessage('reminderDate') }}</span>

          <InputDatetime
              required
              id="input-datetime"
              class="form-control w-100"
              v-model="form.input.datetime"
              :rewritePastTime="!form.isCreating()"
          />
          <IconCheck class="date-confirm-icon"/>
        </div>
        
        <button v-if="!showExtraFields"
                type="button"
                @click="showExtraFields = !showExtraFields"
                class="reminder-more-btn mb-30"
        >
          <span>{{ browser.i18n.getMessage('reminderAdvanced') }}</span>
          <IconDown />
        </button>

        <RepeatField
            v-if="showExtraFields"
            :startDate="form.input.datetime"
            v-model:rrule="form.input.recurrence"
            v-model:fromTime="form.input.recurrenceFromTime"
            v-model:toTime="form.input.recurrenceToTime"
            @scrollToBottom="scrollToBottom"
        />
        <label class="form-label mb-15" v-show="showExtraFields">
          <span class="form-label__title">
            URL <IconInfo
              width="15"
              height="15"
              class="form-label__info"
              v-title="browser.i18n.getMessage('reminderUrlInfo') + '<br>' + browser.i18n.getMessage('browserMustBeRun')"
          />
          </span>

          <input type="url" v-model="form.input.url" class="form-control w-100" placeholder="https://example.com" maxlength="2000">
        </label>
        <div v-show="showExtraFields" class="text-center">
<!--          <label class="form-check mb-20 mt-5" v-if="!form.input.url">-->
<!--                <span>-->
<!--                  <IconSync height="20" width="22" class="v-a-m"/>-->
<!--                  {{ browser.i18n.getMessage('syncWithGoogleCalendar') }}-->
<!--                </span>-->
<!--            <input-->
<!--                type="checkbox"-->
<!--                v-model="form.input.googleSync"-->
<!--                :true-value="1"-->
<!--                :false-value="0"-->
<!--                class="form-control w-100"-->
<!--                @click="reminderGoogleSyncClickHandler"-->
<!--            >-->
<!--          </label>-->
        </div>
     
        <div :class="['reminder-buttons', {'--is-sticky': reminderButtonsIsSticky}]" ref="reminderButtonsRef">
          <button type="button" class="reminder-cancel" @click="form.reset" v-title="browser.i18n.getMessage('cancel')">
            <!--            можно сделать двойной эффект при создании - сначала очистка, а второй клик отмена-->
<!--            <IconCancel />-->
            <IconXmark />
          </button>
          <button 
              type="submit" 
              class="reminder-save" 
              :disabled="recognitionService.state.isRecording"
              v-title="browser.i18n.getMessage(form.isCreating() ? 'saveBtn' : 'updateBtn')"
          >
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
import {useToast} from "vue-toastification";
import RecordBtn from "@/components/RecordBtn.vue";
import {RecognitionService} from "@/modules/recognitionService.ts";
import {browser} from 'wxt/browser';
import IconDown from "@/components/icons/IconDown.vue";
import {sendGoogleLoginMessage} from "@/modules/utils/auth.js";
import IconInfo from "@/components/icons/IconInfo.vue";
import {isNumeric} from "@/modules/utils/helpers.ts";
import RepeatField from "@/components/RepeatField.vue";
import IconSync from "@/components/icons/IconSync.vue";
import {useDebounceFn, useEventListener} from "@vueuse/core";
import {getDefaultShowExtraFieldsStore} from "@/modules/utils/storage.ts";

const props = defineProps({
  backToPanel: {
    type: String,
  },
  initialFormData: {
    type: Object,
    default: () => ({})
  },
  autostartRecording: {
    type: Boolean,
    default: false
  },
  authenticatedEmail: {
    type: String,
  },
});

const emit = defineEmits(["close", "update:initialFormData"]);
const toast = useToast();
const reminderService = ReminderService.instance();
const recognitionService = RecognitionService.instance();

const reminderTitleRef = ref();
const reminderButtonsRef = ref();
const reminderDetailsRef = ref();
const recognitionLocale = ref();
const reminderButtonsIsSticky = ref();
const defaultShowExtraFieldsStore = getDefaultShowExtraFieldsStore();

const formRef = ref();
const panelBodyRef = ref();
const showExtraFields = ref();//изначально должен быть Undefined!
const isAuthenticated = computed(() => !!props.authenticatedEmail);
const formInputInitData = {
  id: null,
  title: '',
  url: null,
  datetime: null,
  desc: null,
  googleSync: null,
  recurrence: null,
  recurrenceFromTime: null,
  recurrenceToTime: null,
  recurrencePause: 0,
};

const form = reactive({
  saved: false,
  input: formInputInitData,
  save: async function () {
    await nextTick(); //чтобы успели все правила валидации обновиться 
    if (! formRef.value.reportValidity()){
      return
    }

    if (this.input.url){
      this.input.googleSync = 0;
    } else if(!isAuthenticated && ! this.input.googleSync){
      this.input.googleSync = null;
    }
    
    this.input.recurrencePause = 0;
    
    const id = await reminderService.save({...this.input});
    recognitionService.resetState();
    
    if (id){
      this.saved = id;
      
      setTimeout(() => {
        this.reset();
      }, this.isCreating() ? 300 : 0);
    }
  },
  hasExtraFields: function(){
    return Object.keys(this.input).some(key => ! ['id', 'title', 'datetime', 'googleSync'].includes(key) && this.input[key]);
  },
  reset: function ()  {
    emit('close', {savedId: this.saved, isCreating: this.isCreating()});
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


const scrollToBottom = () => {
  panelBodyRef.value.scrollTo({
    top: 1000,
    behavior: 'smooth'
  });
}

const checkButtonsSticky = () => {
  reminderButtonsIsSticky.value = panelBodyRef.value.scrollHeight - panelBodyRef.value.scrollTop > panelBodyRef.value.clientHeight + 10
}

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


const reminderGoogleSyncClickHandler = (event) => {
  if (!isAuthenticated.value) {
    sendGoogleLoginMessage((response) => {
      event.target.checked = response.success;
    });

    return false;
  }
}

watch(() => showExtraFields.value, async (value, oldValue) => {
  await nextTick();
  checkButtonsSticky();

  if (value && reminderDetailsRef.value) {
    const fields = reminderDetailsRef.value.querySelectorAll('input,textarea');
    let focusingEl;

    fields.forEach(el => {
      if (el.value?.length && el.type !== 'checkbox') {
        focusingEl = el;
        return false;
      }
    })

    if (oldValue !== undefined) {
      focusingEl ??= fields[0];
      focusingEl?.focus();
    }
    
    if (form.isCreating()) {
      form.input.desc = null;
    }
  }
}, {immediate: true});


onMounted(async () => {
  Object.assign(form.input, props.initialFormData);
  emit('update:initialFormData', {});
  
  if (isAuthenticated.value && !isNumeric(form.input.googleSync)){
    form.input.googleSync = 1;
  }
  
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

    if (value?.date && value.date !== oldValue?.date){
      const inputDatetimeEl = document.getElementById('input-datetime');
      
      if (inputDatetimeEl){
        inputDatetimeEl.classList.add('--changed');
        
        setTimeout(() => {
          inputDatetimeEl.classList.remove('--changed');
        }, 1000)
      }
    }
  }, {
    deep: true,
    immediate: true,
  })

  watch(() => recognitionService.state.error, (value) => {
    value && toast.error(value);
  }, {immediate: true})

  
  if (form.hasExtraFields() || await defaultShowExtraFieldsStore.getValue()){
    showExtraFields.value = true
  }

  defaultShowExtraFieldsStore.watch((newVal, oldVal) => {
    if (newVal){
      showExtraFields.value = true
    } else if (!form.hasExtraFields()){
      showExtraFields.value = false
    }
  })
  
  if (props.autostartRecording){
    emit('update:autostartRecording', false);
  }

  useEventListener(panelBodyRef.value, 'scroll', useDebounceFn(checkButtonsSticky, 100), {passive: true})
})

onUnmounted(() => {
  recognitionService.stop();
  recognitionService.resetState();
})

</script>