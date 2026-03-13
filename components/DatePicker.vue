<template>
  <v-date-picker
      color="primary"
      elevation="24"
      weekday-format="short"
      :allowed-dates="() => allowedDates.length ? allowedDates : false"
      :max="maxFilterDate"
      :min="minFilterDate"
      hide-header
      ref="calendarFilterRef"
      format="datetime"
      show-adjacent-months
  >
    <template v-slot:controls="{ disabled, nextMonth, prevMonth, monthYearText, openYears, openMonth }">
      <v-btn :disabled="disabled.includes('prev-month')" color="primary" icon="$prev" @click="prevMonth "></v-btn>
      <v-spacer/>
      <!--        <div class="text-center cursor-pointer" @click="openYears">-->
      <div class="text-center">
        <div class="text-caption my-n1 text-primary">{{ monthYearText.split(' ')[1] }}</div>
        <div class="text-body-1">{{ monthYearText.split(' ')[0] }}</div>
      </div>
      <v-spacer/>
      <v-btn :disabled="disabled.includes('next-month')" color="primary" icon="$next" @click="nextMonth"></v-btn>
    </template>
  </v-date-picker>

</template>

<script setup>
import {VBtn} from "vuetify/components/VBtn";
import {VDatePicker} from "vuetify/components/VDatePicker";
import {ref} from "vue";
import {onClickOutside} from "@vueuse/core";

const props = defineProps({
  allowedDates: Array,
  maxFilterDate: String,
  minFilterDate: String,
})

const emit = defineEmits(["close", "update:filterDate"]);
// const filterDate = ref(null);
const calendarFilterRef = ref();

onClickOutside(calendarFilterRef, () => {
    emit('close')
})
</script>