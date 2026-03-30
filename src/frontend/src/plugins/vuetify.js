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
                    background: '#0f172a',
                    surface: '#1e293b',
                    'surface-variant': '#334155',
                    primary: '#14b8a6',
                    'primary-darken-1': '#0d9488',
                    secondary: '#06b6d4',
                    'secondary-darken-1': '#0891b2',
                    success: '#10b981',
                    warning: '#f59e0b',
                    error: '#ef4444',
                    info: '#06b6d4',
                    'on-background': '#e2e8f0',
                    'on-surface': '#e2e8f0',
                    'on-primary': '#ffffff',
                    'on-secondary': '#ffffff',
                }
            }
        }
    }
})
