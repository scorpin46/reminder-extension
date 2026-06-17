import { ref } from 'vue'
import { getDarkModeStore } from "@/modules/utils/storage"

const darkModeStore = getDarkModeStore()
const isDarkMode = ref(await darkModeStore.getValue());

const toggleTheme = (isDark: boolean) => {
    isDarkMode.value = isDark;

    if (isDark){
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

toggleTheme(isDarkMode.value)

darkModeStore.watch(v => toggleTheme(v))

export const useDarkMode = () => {
    // onMounted(async () => {
    // })
    return { isDarkMode, darkModeStore }
}