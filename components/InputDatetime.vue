<template>
  <input
      ref="inputRef"
      type="datetime-local"
      :value="displayValue"
      :min="minDateTime"
      @input="input"
      @click="onClick"
      @focus="onFocus"
      @change="onChange"
      @keydown="onKeydown"
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
    console.log(err);
  }
}

const onFocus = async () => {
  if (inputRef.value.value < inputRef.value.min){
    inputRef.value.value = inputRef.value.min; 
    input();
    await nextTick();
  }

  openInputPicker()
}

const onClick = (event) => {
  openInputPicker()
}

const onChange = (event) => {
  if (inputRef.value.value && inputRef.value.value < minDateTime.value) {
    inputRef.value.value = minDateTime.value;
  }

  input();
}

const onKeydown = (e) => {
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    const allFocusable = Array.from(e.target.form?.querySelectorAll(
        'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    ) || []).filter(el => !el.disabled);

    const currentIndex = allFocusable.indexOf(e.target);
    const nextElement = allFocusable[currentIndex + 1];

    if (nextElement) {
      nextElement.focus();
    }
  } else if ((/^[0-9]$/.test(e.key))) {
    e.preventDefault();
  }
}

// При вводе из input → в Date с часовым поясом
const input = () => {
  let inputValue = inputRef.value.value
  const offset = getTimezoneOffset()
  const dateWithOffset = new Date(inputValue + ':00' + offset);
  
  if (!inputValue || isNaN(dateWithOffset)) {
    emit('update:modelValue', null)
    return
  }

  emit('update:modelValue', dateWithOffset)
  //todo можно сделать вот как - при выборе времени меньшего , но в том же дне, переводить на следующий день (типо выбрал 00:10, но как тогда выбор полночи при текущем 00:05) 
}

defineExpose({
  onFocus,
  inputRef,
})

</script>