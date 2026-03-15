import {createApp} from 'vue'
import App from './Postpone.vue';
import '@/assets/scss/postpone.scss';
import {blockPageScaling, detectLocale} from "@/modules/utils/helpers.ts";
blockPageScaling();

document.title = browser.i18n.getMessage('postponeTitle') + ' 🕒';

document.documentElement.lang = detectLocale();

const app = createApp(App);
app.mount('#app');
