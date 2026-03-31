<template>
  <v-app>
    <div class="login-page">
      <!-- Login Card -->
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="5" lg="4">
            <div class="login-card-wrapper">
              <!-- Logo/Title Section -->
              <div class="login-header">
                <div class="logo-container">
                  <v-icon size="48" color="primary">mdi-monitor-dashboard</v-icon>
                </div>
                <h1 class="login-title">PM2 Monitor</h1>
                <p class="login-subtitle">Manage your services with ease</p>
              </div>

              <!-- Login Form Card -->
              <v-card class="login-card glass-card" elevation="0">
                <v-card-text class="pa-8">
                  <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
                    {{ error }}
                  </v-alert>

                  <v-form @submit.prevent="handleLogin">
                    <v-text-field
                      v-model="username"
                      label="Username"
                      prepend-inner-icon="mdi-account"
                      variant="outlined"
                      color="primary"
                      class="mb-4 modern-input"
                      required
                      density="comfortable"
                    ></v-text-field>

                    <v-text-field
                      v-model="password"
                      label="Password"
                      prepend-inner-icon="mdi-lock"
                      type="password"
                      variant="outlined"
                      color="primary"
                      class="mb-6 modern-input"
                      required
                      density="comfortable"
                    ></v-text-field>

                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      block
                      class="login-btn"
                      :loading="authStore.loading"
                      elevation="0"
                    >
                      <v-icon left class="mr-2">mdi-login</v-icon>
                      Sign In
                    </v-btn>
                  </v-form>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  const result = await authStore.login(username.value, password.value)
  if (result.success) {
    router.push('/apps')
  } else {
    error.value = result.error
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #0d0d14;
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 40% at 20% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 70%),
    radial-gradient(ellipse 40% 30% at 80% 80%, rgba(99, 102, 241, 0.04) 0%, transparent 70%);
  pointer-events: none;
}

.login-card-wrapper {
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.4s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 16px;
  margin-bottom: 1.25rem;
}

.login-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 0.35rem;
  letter-spacing: -0.01em;
}

.login-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 400;
}

.login-card {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 14px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
  transition: border-color 0.2s ease !important;
}

.login-card:hover {
  border-color: rgba(99, 102, 241, 0.2) !important;
}

.modern-input :deep(.v-field) {
  transition: border-color 0.2s ease;
}
</style>

