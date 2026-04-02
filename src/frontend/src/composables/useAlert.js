import { reactive } from 'vue'

const state = reactive({
    show: false,
    text: '',
    type: 'success',
    timer: null
})

export function useAlert() {
    const showAlert = (text, type = 'success', duration = 4000) => {
        if (state.timer) clearTimeout(state.timer)
        state.text = text
        state.type = type
        state.show = true
        state.timer = setTimeout(() => { state.show = false }, duration)
    }

    const closeAlert = () => {
        state.show = false
        if (state.timer) clearTimeout(state.timer)
    }

    return { alertState: state, showAlert, closeAlert }
}
