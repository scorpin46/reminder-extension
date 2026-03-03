<template>
  <div class="panel">
    <div class="tabs" ref="tabsRef" :class="{ 'sticky': tabsIsSticky }">
      <div class="tabs__left">
        <!--    <input type="date" v-model="filterDate">-->
        <DatePicker class="" v-model="filterDate" v-if="calendarIsOpened" @close="calendarIsOpened = false" :allowedDates="allowedDates" :minFilterDate="minFilterDate" :maxFilterDate="maxFilterDate"/>

        <span
          role="button"
          class="tab tab--calendar"
          @click="calendarIsOpened = ! calendarIsOpened"
          title="Фильтр по дате"
          :data-selected="filterDate?.toLocaleDateString(reminderService.regionLocale)"
        >
<!--          <svg class="v-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z"></path></svg>-->
          <IconCalendar/>
        </span>
        <span
          role="button"
          v-show="hasFilterDate"
          class="tab tab--clear-filter"
          @click="filterDate = null"
          title="Убрать Фильтр"
        >
          <IconXmark/>
        </span>
      </div>


      <label class="tab dynamic-counter">
        <input v-model="selectedFilter" name="selectedFilter" value="active" type="radio" hidden>
        <span :data-count="reminderService.repository.state.active.length" class="secondary">
            <template v-if="expired.length">❗</template>
            <template v-else>
<!--              <IconTimer height="19"/>-->
            </template>
          Актуальные
        </span>
      </label>
      <!--      <label class="tab">-->
      <!--        <input v-model="selectedFilter" value="expired" type="radio" hidden>-->
      <!--        <span :data-count="expiredItems.length" class="danger">Просроченные</span>-->
      <!--      </label>-->
      <label class="tab dynamic-counter">
        <input v-model="selectedFilter" name="selectedFilter" value="completed" type="radio" hidden>
        <span :data-count="reminderService.repository.state.completed.length" class="secondary">
        <IconChecks v-show="selectedFilter === 'completed'" class="color-green" height="16"/>
          Завершенные
        </span>
      </label>
      
      <div class="tabs__right"></div>
    </div>

    <div v-if="hasFilterDate && ! Object.keys(daysGroupsReminders).length">
<!--      Ничего не найдено-->
<!--      по выбранной дате ({{ localDateFormat(filterDate, false, reminderService.regionLocale) }}) напоминаний не найдено-->

      Ничего не найдено по запросу "filterSearch" 
<!--      todo и сделать календарь внутри поисковой строки чтоб он вставлял дату в поле и по нему искалось, когда regex совпадает, т.е. это просто подсказка для input-->
      
<!--      todo и все-таки узнать реально ли как-то блокировать даты в классическом input date ,пускай и по клику-->
      <button>Очистить</button>
    </div>

    <div class="reminders">
      <div v-for="(group, dateString) in daysGroupsReminders" :key="dateString">
        <div class="reminders-day">
          <template v-if="dateString !== 'expired'">
            <span>{{ group.label }}</span>
            <span>{{ dateString }}</span>
          </template> 
          <template v-else>
            <span class="color-red">
              {{ group.label }} <span> ({{ group.items.length }})</span>
<!--              {{ group.label }} <span class="danger-label ml-5">{{ group.items.length }}</span>-->
            </span>
          </template> 
        </div>

        <div v-for="(item, key) in group.items" :key="`${item.id}`"
             :class="{
                'reminders-item': true, 
                '--expired': expired.includes(item.id),
                '--completed': item.completed, 
                '--soon': soon.includes(item.id),
             }"
             :id="`reminder-${item.id}`"
             :title="item.previewTitle"
        >
          <div class="reminders-item__title notranslate">{{ item.title }}</div>
          <div class="reminders-item__time-box">
            <div class="reminders-item__time">{{ item.localTime }}</div>

            <div class="reminders-item__day">
              <IconTimer width="14" height="14"/>
              <span>{{ item.timeUntil }}</span>
              <IconChecks v-if="item.completed" width="16" height="16"/>
            </div>
          </div>

          <div class="reminders-item__actions" @click="editItem(item)">
            <span role="button" class="reminders-item__edit" title="Редактировать (сделать перевод)" @click.stop="editItem(item)">
              <IconEdit/>
            </span>
            <span role="button" v-if="!item.completed" class="reminders-item__complete" title="Завершить (сделать перевод)" @click.stop="completeReminder(item)">
              <IconChecks/>
            </span>
            <span role="button" v-if="item.completed" class="reminders-item__delete" title="Удалить" @click.stop="reminderService.deleteReminder(item.id)">
              <IconXmark/>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import {useDate} from "vuetify/framework";
import {ReminderService} from "@/modules/reminderService.js";
import {computed, onMounted, ref, watch} from "vue";
import {localDateFormat} from "@/modules/utils/helpers.ts";
import {useIntervalFn} from "@vueuse/core";
import IconChecks from "@/components/icons/IconChecks.vue";
import IconTimer from "@/components/icons/IconTimer.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconXmark from "@/components/icons/IconXmark.vue";
import IconCalendar from "@/components/icons/IconCalendar.vue";
import {max, min} from "es-toolkit/compat";
import DatePicker from "@/components/Datepicker.vue";

const reminderService = ReminderService.instance();

const emit = defineEmits(['editItem']);
const dateAdapter = useDate()

const tabsRef = ref()
const tabsIsSticky = ref(false)

const selectedFilter = ref('active');
const calendarIsOpened = ref(false);
const filterDate = ref(null);

const reminders = computed(() => {

  let result = [];
  
  if (selectedFilter.value === 'active'){
    result = reminderService.repository.state.active;
  } else if(selectedFilter.value === 'completed'){
    result = reminderService.repository.state.completed;
  }

  return result;
});

const hasFilterDate = computed(() => !!filterDate.value);

const daysGroupsReminders = computed(() => {
  const groups = {};
  
  reminders.value.forEach((item) => {
    if (filterDate.value && ! dateAdapter.isSameDay(item.datetime, filterDate.value)){
      return true;
    }

    let groupKey = item.datetime.toLocaleDateString(reminderService.regionLocale);
    let label = localDateFormat(item.datetime, false, reminderService.regionLocale, true)
    
    if (expired.value.includes(item.id)){
      groupKey = 'expired';
      label = "Просроченные"
    }

    groups[groupKey] ??= {
      items: [],
      label: label
    }

    const extendedItem = {...item};

    extendedItem.previewTitle = reminderService.reminderPreviewTitle(item, now.value);
    extendedItem.timeUntil = reminderService.reminderTimeUntil(item, now.value);
    extendedItem.localTime = reminderService.reminderLocalTime(item, now.value)
    
    groups[groupKey].items.push(extendedItem);
  })
  
  return groups;
});

const allowedDates = computed(() => {
  return Array.from(new Set(reminders.value.map(item => dateAdapter.toISO(item.datetime))));
});

const minFilterDate = computed(() => {
  return min(allowedDates.value);
});

const maxFilterDate = computed(() => {
  return max(allowedDates.value);
});

const expired = ref([]);
const soon = ref([]);
const now = ref();

const actualize = () => {
  now.value = new Date();
  expired.value = reminderService.repository.state.active.filter(item => !item.completed && item.datetime < now.value).map(item => item.id);
  soon.value = reminderService.repository.state.active.filter(item => {
    const diff = item.datetime - now.value;
    return !item.completed && diff > 0 && diff < 10 * 60 * 1000
  }).map(item => item.id);
}

const completeReminder = (item) => {
  reminderService.completeReminder(item.id);
  now.value = new Date();
}


const editItem = (item) => {
  emit('editItem', item.id)
}

useIntervalFn(() => {
  if (!calendarIsOpened.value) {
    actualize();
  }
}, 5000, {
  immediateCallback: true
})

watch(() => reminderService.repository.state.active, (value, oldValue) => {
  actualize();
})

</script>