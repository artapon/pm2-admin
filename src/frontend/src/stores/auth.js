import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        isAuthenticated: false,
        username: null,
        role: null,
        loading: false,
        setupRequired: false
    }),

    actions: {
        async login(username, password) {
            this.loading = true
            try {
                const response = await api.login(username, password)
                if (response.data.success) {
                    this.isAuthenticated = true
                    this.username = username
                    this.role = response.data.data.role
                    return { success: true }
                }
                return { success: false, error: response.data.error || 'Login failed' }
            } catch (error) {
                return { success: false, error: error.response?.data?.error || 'Login failed' }
            } finally {
                this.loading = false
            }
        },

        async logout() {
            try {
                await api.logout()
                this.isAuthenticated = false
                this.username = null
                this.role = null
            } catch (error) {
                console.error('Logout error:', error)
            }
        },

        async checkSession() {
            try {
                const response = await api.getSession()
                if (response.data.success && response.data.data.isAuthenticated) {
                    this.isAuthenticated = true
                    this.username = response.data.data.username
                    this.role = response.data.data.role
                } else {
                    this.isAuthenticated = false
                    this.username = null
                    this.role = null
                }
            } catch (error) {
                this.isAuthenticated = false
                this.username = null
                this.role = null
            }
        },
        async checkSetupStatus() {
            try {
                const response = await api.checkSetup()
                this.setupRequired = !!response.data.setupRequired
            } catch (error) {
                console.error('Setup check failed:', error)
            }
        }
    }
})
