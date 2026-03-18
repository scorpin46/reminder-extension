import {createApp} from 'vue'
import App from './App.vue'
import Toast from 'vue-toastification';
import {vHorizontalWheel, vVisibility} from '@/modules/utils/directives';
import {createVuetify} from 'vuetify'
import {aliases, mdi} from 'vuetify/iconsets/mdi-svg' // для оптимизированных
import "vue-toastification/dist/index.css";
import 'vuetify/styles'
import '@/assets/scss/styles.scss'
import {detectLocale, blockPageScaling} from "@/modules/utils/helpers.ts";
import { plugin as VueTippy } from 'vue-tippy'

blockPageScaling();
document.title = browser.i18n.getMessage('mainTitle');

const locale = detectLocale();
document.documentElement.lang = locale;

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

const app = createApp(App);

app.directive('visibility', vVisibility);
app.directive('horizontal-wheel', vHorizontalWheel);

app.use(vuetify)
app.use(
    VueTippy,
    // optional
    {
        directive: 'title', // => v-tippy
        component: 'tippy', // => <tippy/>
        componentSingleton: 'tippy-singleton', // => <tippy-singleton/>,
        defaultProps: {
            placement: 'auto-end',
            allowHTML: false,
        }, 
    }
)
app.use(Toast, {
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


app.mount('#app');