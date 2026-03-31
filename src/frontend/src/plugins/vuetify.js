import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
    theme: {
        defaultTheme: 'dark',
        themes: {
            dark: {
                dark: true,
                colors: {
                    background: '#0d0d14',
                    surface: '#13131f',
                    'surface-variant': '#1a1a2e',
                    primary: '#6366f1',
                    'primary-darken-1': '#4f46e5',
                    secondary: '#818cf8',
                    'secondary-darken-1': '#6366f1',
                    success: '#22c55e',
                    'success-darken-1': '#16a34a',
                    warning: '#f59e0b',
                    error: '#ef4444',
                    info: '#06b6d4',
                    'on-background': '#f1f5f9',
                    'on-surface': '#f1f5f9',
                    'on-primary': '#ffffff',
                    'on-secondary': '#ffffff',
                    'on-success': '#ffffff',
                }
            }
        }
    }
})
