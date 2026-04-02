import { defineStore } from 'pinia'

export const useLayoutStore = defineStore('layout', {
    state: () => ({
        // null lets Vuetify decide the initial open state based on breakpoint
        drawer: null,
        rail: false
    })
})
