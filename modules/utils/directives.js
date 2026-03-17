export const vVisibility = {
    beforeMount(el, binding) {
        el.style.visibility = binding.value ? '' : 'hidden';
    },
    updated(el, binding) {
        el.style.visibility = binding.value ? '' : 'hidden';
    }
};

export const vHorizontalWheel = {
    mounted(el, binding) {
        const onWheel = (event) => {
            if (el.scrollWidth > el.clientWidth) {
                event.preventDefault();
                const delta = event.deltaY || event.deltaX;
                el.scrollLeft += delta;
            }
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        el._onWheelHandler = onWheel; // Сохраняем для удаления
    },
    unmounted(el) {
        if (el._onWheelHandler) {
            el.removeEventListener('wheel', el._onWheelHandler);
        }
    }
}