export const vVisibility = {
    beforeMount(el, binding) {
        el.style.visibility = binding.value ? '' : 'hidden';
    },
    updated(el, binding) {
        el.style.visibility = binding.value ? '' : 'hidden';
    }
};