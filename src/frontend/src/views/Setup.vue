<template>
  <v-app>
    <div class="setup-page">
      <!-- Animated Background -->
      <div class="setup-background">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>

      <!-- Setup Card -->
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6" lg="5">
            <div class="setup-card-wrapper fade-in">
              <!-- Header Section -->
              <div class="setup-header">
                <div class="logo-container">
                  <v-icon size="48" color="primary">mdi-shield-crown</v-icon>
                </div>
                <h1 class="setup-title">Initial Setup</h1>
                <p class="setup-subtitle">Create your first Root administrator account</p>
              </div>

              <!-- Setup Form Card -->
              <v-card class="setup-card glass-card" elevation="0">
                <v-card-text class="pa-8">
                  <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
                    {{ error }}
                  </v-alert>

                  <v-alert type="info" variant="tonal" class="mb-6">
                    <v-icon start>mdi-information</v-icon>
                    This is a one-time setup. Once the first account is created, this page will no longer be accessible.
                  </v-alert>

                  <v-form ref="formRef" v-model="valid" @submit.prevent="handleSetup">
                    <v-text-field
                      v-model="username"
                      label="Root Username"
                      placeholder="e.g., admin"
                      prepend-inner-icon="mdi-account"
                      variant="outlined"
                      color="primary"
                      class="mb-4 modern-input"
                      required
                      :rules="[v => !!v || 'Username is required', v => v.length >= 4 || 'Minimum 4 characters']"
                      density="comfortable"
                    ></v-text-field>

                    <v-text-field
                      v-model="password"
                      label="Root Password"
                      prepend-inner-icon="mdi-lock"
                      type="password"
                      variant="outlined"
                      color="primary"
                      class="mb-6 modern-input"
                      required
                      :rules="[v => !!v || 'Password is required', v => v.length >= 8 || 'Minimum 8 characters']"
                      density="comfortable"
                    ></v-text-field>

                    <v-text-field
                      v-model="confirmPassword"
                      label="Confirm Password"
                      prepend-inner-icon="mdi-lock-check"
                      type="password"
                      variant="outlined"
                      color="primary"
                      class="mb-6 modern-input"
                      required
                      :rules="[v => !!v || 'Please confirm password', v => v === password || 'Passwords do not match']"
                      density="comfortable"
                    ></v-text-field>

                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      block
                      class="setup-btn"
                      :loading="loading"
                      :disabled="!valid"
                      elevation="0"
                    >
                      <v-icon left class="mr-2">mdi-check-circle</v-icon>
                      Complete Setup
                    </v-btn>
                  </v-form>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Success Dialog -->
    <v-dialog v-model="successDialog" persistent max-width="400">
      <v-card class="pa-4 text-center">
        <v-card-text>
          <v-icon color="success" size="64" class="mb-4">mdi-check-circle-outline</v-icon>
          <h2 class="text-h5 font-weight-bold mb-2">Setup Complete!</h2>
          <p class="text-body-1 text-medium-emphasis mb-4">
            Your Root administrator account has been created successfully.
          </p>
          <v-btn color="primary" block size="large" @click="goToLogin">
            Go to Login
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const valid = ref(false)
const loading = ref(false)
const error = ref('')
const successDialog = ref(false)

const username = ref('')
const password = ref('')
const confirmPassword = ref('')

const handleSetup = async () => {
  if (!valid.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await api.setupInitial({
      username: username.value,
      password: password.value
    })
    
    if (response.data.success) {
      successDialog.value = true
    } else {
      error.value = response.data.error || 'Setup failed'
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Connection error'
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

onMounted(async () => {
  try {
    const response = await api.checkSetup()
    if (response.data.success && !response.data.setupRequired) {
      // Redirect to login if setup is already complete
      router.push('/login')
    }
  } catch (err) {
    console.error('Setup check failed:', err)
  }
})
</script>

<style scoped>
.setup-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: #0f172a;
}

.setup-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  animation: bgPulse 20s infinite alternate;
}

@keyframes bgPulse {
  0% { transform: scale(1); }
  33% { transform: translate(30px, -30px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: scale(1); }
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.2;
}

.orb-1 { width: 500px; height: 500px; background: #667eea; top: -100px; left: -100px; }
.orb-2 { width: 400px; height: 400px; background: #764ba2; bottom: -50px; right: 20%; }
.orb-3 { width: 300px; height: 300px; background: #3b82f6; top: 30%; right: -50px; }

.setup-card-wrapper { position: relative; z-index: 1; }
.setup-header { text-align: center; margin-bottom: 2rem; }
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

.setup-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.setup-subtitle { color: #94a3b8; font-size: 1rem; }
.setup-card { border: 1px solid rgba(255, 255, 255, 0.1); }
.modern-input :deep(.v-field) { transition: all 0.3s ease; }
.setup-btn {
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.5px;
  height: 52px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3) !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.8s ease-out; }
</style>
