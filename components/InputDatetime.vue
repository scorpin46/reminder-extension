<template>
  <input
      ref="inputRef"
      type="datetime-local"
      :value="displayValue"
      :min="minDateTime"
      @input="onInput"
      @click="onClick"
      @focus="onFocus"
      @change="onChange"
  />
</template>

<script setup>
import {computed, nextTick, ref} from 'vue'

const props = defineProps({
  modelValue: Date,
  // Минимальное смещение от текущего времени (в минутах)
  minOffsetMinutes: {
    type: Number,
    default: 1 // по умолчанию +1 минута
  }
})

const emit = defineEmits(['update:modelValue', 'change'])
const inputRef = ref();

// Текущее время + смещение
const minDateTime = computed(() => {
  const now = new Date()
  const minDate = new Date(now.getTime() + props.minOffsetMinutes * 60 * 1000)

  // Форматируем для input
  const year = minDate.getFullYear()
  const month = String(minDate.getMonth() + 1).padStart(2, '0')
  const day = String(minDate.getDate()).padStart(2, '0')
  const hours = String(minDate.getHours()).padStart(2, '0')
  const minutes = String(minDate.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
})

// Для отображения в input
const displayValue = computed(() => {
  if (!props.modelValue){
    // return minDateTime.value; //todo возможно поставить удобнее будет?
    return '';
  }
  const date = props.modelValue
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
})

const getTimezoneOffset = () => {
  const offset = new Date().getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const minutes = String(absOffset % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

const openInputPicker = () => {
  try {
    inputRef.value?.showPicker();
  } catch (err){
    console.error(err);
  }
}

const onFocus = async () => {
  if (inputRef.value.value > inputRef.value.min){
    await nextTick();
    onInput();
  }

  openInputPicker()
}

const onClick = (event) => {
  openInputPicker()
}

const onChange = (event) => {
  emit('change', event)
}

// При вводе из input → в Date с часовым поясом
const onInput = () => {
  let inputValue = inputRef.value.value
 
  if (!inputValue) {
    emit('update:modelValue', null)
    return
  }
  
  if (inputValue < minDateTime.value) {
    inputValue = minDateTime.value;
  }

  const offset = getTimezoneOffset()
  const dateWithOffset = new Date(inputValue + ':00' + offset);
  
  emit('update:modelValue', dateWithOffset)
}

defineExpose({
  onFocus,
  inputRef,
})

</script>