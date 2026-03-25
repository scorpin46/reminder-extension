<template>
  <header class="header">

    <div class="header__add-group">
      <button
          :class="{'header__add': true, '--active': editingPanelVisible}"
          type="button"
          :title="editingPanelVisible ? browser.i18n.getMessage('close') : browser.i18n.getMessage('addNewReminder')"
          @click="editingPanelVisible = !editingPanelVisible"
          @dblclick="editingPanelVisible = !editingPanelVisible"
      >
        <IconPlus/>
      </button>
      <RecordBtn @click="editingPanelVisible = true"/>
    </div>
    

    <div class="header__menu menu">
      <button
          id="menu-item-actual"
          :class="{'menu__item': true, '--active': openedTab === 'active'}"
          :data-count="reminderService.repository.state.active.length"
          @click="openedTab = 'active'"
      >
        <template v-if="hasExpired">❗</template>
        <span>{{ browser.i18n.getMessage('actualTab') }}</span>
      </button>
      <button
          :class="{'menu__item': true, '--active': openedTab === 'completed'}"
          :data-count="reminderService.repository.state.completed.length"
          @click="openedTab = 'completed'"
      >
        <span>{{ browser.i18n.getMessage('completedTab') }}</span>
      </button>
    </div>

    <button
        type="button"
        :class="['header__search-btn', {'--active': searchVisible}]"
        :title="! searchVisible ? browser.i18n.getMessage('search') : browser.i18n.getMessage('close') + ' ' + browser.i18n.getMessage('search').toLocaleLowerCase()"
        @click="searchVisible = !searchVisible"
    >
      <IconSearch/>
      <IconXmark v-if="searchVisible" class="icon-xmark"/>
    </button>
  </header>
</template>

<script setup>
import IconPlus from "@/components/icons/IconPlus.vue";
import IconSearch from "@/components/icons/IconSearch.vue";
import {ReminderService} from "@/modules/reminderService.ts";
import {computed, nextTick} from "vue";
import IconXmark from "@/components/icons/IconXmark.vue";
import RecordBtn from "@/components/RecordBtn.vue";

const props = defineProps({
  editingPanelVisible: {
    type: Boolean,
  },
  openedTab: {
    type: String,
    default: "active"
  },
  searchVisible: {
    type: Boolean,
  },
  hasExpired: {
    type: Boolean,
  },
})

const emit = defineEmits(['update:editingPanelVisible', 'update:openedTab', 'update:searchVisible']);
const reminderService = ReminderService.instance();
const openedTab = computed({
  get: () => props.openedTab,
  set: (value) => emit('update:openedTab', value)
})

const editingPanelVisible = computed({
  get: () => props.editingPanelVisible ?? null,
  set: (value) => emit('update:editingPanelVisible', value)
})

const searchVisible = computed({
  get: () => props.searchVisible ?? null,
  set: (value) => emit('update:searchVisible', value)
})
</script>