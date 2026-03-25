import {FloatingFab} from "@/modules/utils/fab.js";
import {browser} from "wxt/browser";

window.addEventListener('message', (event) => {
    // Проверяем, что сообщение от нашего расширения
    if (event.data?.source === 'fab-extension') {
        console.log('Получено сообщение от FAB:', event.data);

        // Обрабатываем разные типы сообщений
        switch (event.data.action) {
            case 'FAB_READY':
            case 'FAB_POSITION_CHANGED':
                const arrow = document.getElementById('watcher-arrow');
                if (!arrow) {
                    return;
                }

                const zoom = window.devicePixelRatio || 1;
                const scaleFactor = 1 / zoom;

                let deg = event.data.side === 'left'
                    ? -event.data.topPercent + event.data.defaultPercent
                    : event.data.topPercent - event.data.defaultPercent;
                
                let scaleX = event.data.side === 'left' ? -1 : 1;
                
                const correctPercent = 4.5;
                // const correctPercent = 3 * scaleFactor;

                deg -= deg / 100 * scaleFactor;
                
                deg += correctPercent * (event.data.side === 'left' ? -1 : 1);
                
                arrow.style.transform = `rotate(${deg}deg) scaleX(${scaleX})`;

                break;
        }
    }
});

function localizePage() {
    // Переводим элементы с атрибутом i18n-content
    document.querySelectorAll('[i18n-content]').forEach(element => {
        const key = element.getAttribute('i18n-content');
        const message = browser.i18n.getMessage(key);
        if (message) {
            element.textContent = message;
        }
    });

    // Переводим атрибуты (например, placeholder)
    document.querySelectorAll('[i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('i18n-placeholder');
        const message = browser.i18n.getMessage(key);
        if (message) {
            element.placeholder = message;
        }
    });

    // Переводим title
    document.querySelectorAll('[i18n-title]').forEach(element => {
        const key = element.getAttribute('i18n-title');
        const message = browser.i18n.getMessage(key);
        if (message) {
            element.title = message;
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    localizePage();
    FloatingFab.run();
})
