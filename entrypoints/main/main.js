import {createApp} from 'vue'
import App from './App.vue'
import Toast from 'vue-toastification';
import {vVisibility} from '@/modules/utils/directives';
import {createVuetify} from 'vuetify'
import {aliases, mdi} from 'vuetify/iconsets/mdi-svg' // для оптимизированных
import "vue-toastification/dist/index.css";
import 'vuetify/styles'
import '@/assets/scss/styles.scss'

const locales = [navigator.language] || navigator.languages;
const locale = locales[0] || 'en';

const vuetify = createVuetify({
    locale: { 
        locale: locale, 
        fallback: 'en',
    },
    icons: {
        defaultSet: 'mdi',
        aliases: {
            ...aliases,
        },
        sets: {
            mdi, // SVG набор
        },
    },
});

const main = createApp(App);

main.directive('visibility', vVisibility);

main.use(vuetify)

main.use(Toast, {
    transition: "Vue-Toastification__fade",
    maxToasts: 1,
    newestOnTop: true,
    position: "top-right",
    timeout: 3000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: true,
    closeButton: "button",
    icon: true,
});


main.mount('#app');