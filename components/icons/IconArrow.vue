<template>
  <span>↑</span>
</template>

<script setup>
const props = defineProps({
  direction: {
    type: String,
    default: 'up'
  }
})
</script>