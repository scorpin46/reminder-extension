import {createApp} from 'vue'
import App from './Postpone.vue';
import '@/assets/scss/postpone.scss';
import {detectLocale} from "@/modules/utils/helpers.ts";

document.documentElement.lang = detectLocale();

const app = createApp(App);
app.mount('#app');
