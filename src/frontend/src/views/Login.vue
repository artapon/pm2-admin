<template>
  <v-app>
    <div class="login-page">
      <!-- Animated Background -->
      <div class="login-background">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>

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
  position: relative;
  overflow: hidden;
}

@keyframes bgPulse {
  0% { transform: scale(1); }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% { transform: scale(1); }
}

.login-card-wrapper {
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  margin-bottom: 1rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 400;
}

.login-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.login-card:hover {
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(102, 126, 234, 0.2);
}

.modern-input :deep(.v-field) {
  transition: all 0.3s ease;
}

.modern-input :deep(.v-field:hover) {
  border-color: rgba(37, 99, 235, 0.5);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

