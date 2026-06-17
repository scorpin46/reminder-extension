<template>
  <span
      v-title="browser.i18n.getMessage('changeTheme')"
      class="theme-switcher"
      role="button"
      @click="darkModeStore.setValue(!isDarkMode)"
  >
    <svg v-if="!isDarkMode" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M10.9 1.667v2.5H9.1v-2.5zm0 14.166v2.5H9.1v-2.5zM4.744 3.471l1.768 1.768-1.273 1.273L3.47 4.744zM14.76 13.488l1.768 1.768-1.273 1.273-1.768-1.768zM4.167 9.1h-2.5v1.8h2.5zm14.166 0h-2.5v1.8h2.5zM3.471 15.256l1.768-1.768 1.273 1.273-1.768 1.768zM13.488 5.24l1.768-1.768 1.273 1.273-1.768 1.768zM6.8 10a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 0 0-6.4 0M5 10a5 5 0 1 0 10 0 5 5 0 0 0-10 0" clip-rule="evenodd"/></svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="currentColor" d="m17.107 12.403.852.288.474-1.402-1.463.225.137.89Zm-9.51-9.51.89.137.224-1.463-1.403.474zm9.373 8.62q-.556.086-1.137.087v1.8q.72-.001 1.41-.107zm-1.137.087A7.433 7.433 0 0 1 8.4 4.167H6.6c0 5.1 4.134 9.233 9.233 9.233zM8.4 4.167q.001-.581.086-1.137l-1.779-.273q-.106.69-.107 1.41zM3.4 10a6.6 6.6 0 0 1 4.485-6.254L7.308 2.04A8.4 8.4 0 0 0 1.6 10zm6.6 6.6A6.6 6.6 0 0 1 3.4 10H1.6a8.4 8.4 0 0 0 8.4 8.4zm6.254-4.485A6.6 6.6 0 0 1 10 16.6v1.8c3.7 0 6.838-2.39 7.96-5.708z"/></svg>
  </span>
</template>

<script setup>
import {useDarkMode} from "@/modules/composables/useDarkMode.ts";
const {isDarkMode, darkModeStore} = useDarkMode();
</script>