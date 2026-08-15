import { ref } from 'vue'

// Confirm dialogs trigger PM2 commands that can take a few seconds. `busy` drives the
// button spinner so a click gives immediate feedback instead of looking like a hang,
// and it swallows repeat clicks while the request is still in flight.
export function useBusy() {
    const busy = ref(false)

    const run = async (fn) => {
        if (busy.value) return
        busy.value = true
        try {
            return await fn()
        } finally {
            busy.value = false
        }
    }

    return { busy, run }
}
