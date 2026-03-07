<template>
  <main :class="{'--recording': recognitionService.state.isRecording}">
    <div class="menu">
      <RecordBtn v-if="activePanel === 'reminders'" class="record-btn--small"/>
<!--      если нужен переход на страницу создания-->
<!--      <RecordBtn v-if="activePanel === 'reminders'" @click="activePanel = 'main'" class="record-btn&#45;&#45;small" />-->

      <label :class="{'menu__item': true, '--active': activePanel === 'main'}">
        <input type="radio" v-model="activePanel" value="main" name="activePanel" checked hidden>

        <template v-if="!editingId">
          <span>Add Reminder</span>
        </template>
        <span v-else>Editing a reminder...</span>
      </label>
      <label
          :class="{'menu__item': true, '--active': activePanel === 'reminders', '--fade': remindersCountUp}"
          :data-count="reminderService.repository.state.active.length"
      >
        <input type="radio" v-model="activePanel" value="reminders" name="activePanel" hidden>
        <span>Reminders</span>
      </label>
    </div>
    <div class="container">
      <MainPanel
          ref="mainPanelRef"
          v-if="activePanel === 'main'"
          :editingId="editingId"
          :backToPanel="backToPanel"
          @toPanel="panel => activePanel = panel"
          @resetForm="editingId = null"
      />
      <RemindersPanel v-else-if="activePanel === 'reminders'" @editItem="editItem" @openMainPanel="activePanel = 'main'"/>
    </div>
  </main>

  <Settings v-if="showSettings" @close="showSettings = false"/>

  <footer>
    <button class="settings-btn" @click="showSettings = true">
      <IconSettings/>
      <span>Настройки</span>
    </button>
  </footer>
</template>
<script setup>
import RemindersPanel from "@/components/RemindersPanel.vue";
import MainPanel from "@/components/MainPanel.vue";
import {ReminderService} from "@/modules/reminderService.js";
import {nextTick, ref, watch} from "vue";
import RecordBtn from "@/components/RecordBtn.vue";
import Settings from "@/components/Settings.vue";
import IconSettings from "@/components/icons/IconSettings.vue";
import {RecognitionService} from "@/modules/recognitionService.ts";

const props = defineProps({
  activePanel: {
    type: String,
  }
})
const reminderService = ReminderService.instance();
const recognitionService = RecognitionService.instance();
const activePanel = ref(props.activePanel ?? 'main');
const editingId = ref();
const mainPanelRef = ref();
const backToPanel = ref();
const remindersCountUp = ref(false);
const showSettings = ref(false);

const editItem = async (id) => {
  backToPanel.value = 'reminders';
  activePanel.value = 'main';
  await nextTick();
  editingId.value = id;
}

const getPanelScrollTopKey = (panel) => 'previousScroll_' + panel

watch(() => activePanel.value, async (value, oldValue) => {
  sessionStorage.setItem(getPanelScrollTopKey(oldValue), window.scrollY)

  await nextTick();

  if (value === 'reminders' && editingId.value) {
    const savedScrollTop = sessionStorage.getItem(getPanelScrollTopKey(value), window.scrollY);

    if (isFinite(savedScrollTop)) {
      window.scrollTo({
        top: savedScrollTop,
        // behavior: 'smooth', //ставить только в случае, если главное меню скрыто
      });

      //todo возможно удобнее будет скроллить к свежеотредактированной записи, и/или к свежесозданной
    }
  }

  if (value !== 'main') {
    editingId.value = null;
  } else {
    mainPanelRef.value.$refs.reminderTitleRef.focus();
  }
}, {
  flush: 'pre',
})

watch(() => recognitionService.isRecording, (value, oldValue) => {
  if (!value && oldValue) {
    activePanel.value = 'main';
    backToPanel.value = 'reminders';
  } else {
    backToPanel.value = null;
  }
})

watch(() => reminderService.repository.state.isLoaded, async () => {
  if (!props.activePanel){
    activePanel.value = !reminderService.repository.state.active.length ? 'main' : 'reminders';
  }
  
  watch(() => reminderService.repository.state.active.length, async (value, oldValue) => {
    if (value > oldValue) {
      remindersCountUp.value = true;

      setTimeout(() => {
        remindersCountUp.value = false;
      }, 3000);
    }
  })
}, {once: true});

</script>