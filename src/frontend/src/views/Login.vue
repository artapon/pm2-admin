<template>
  <v-app>
    <div class="login-page">

      <!-- Background blobs -->
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      <div class="bg-blob blob-3"></div>

      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center" class="fill-height">
          <v-col cols="12" sm="8" md="5" lg="4" xl="3">

            <div class="login-wrapper">

              <!-- Card -->
              <div class="login-card">

                <!-- Brand -->
                <div class="brand-area">
                  <div class="brand-icon">
                    <v-icon size="28" color="primary">mdi-monitor-dashboard</v-icon>
                  </div>
                  <div class="brand-name">PM2 Admin</div>
                  <div class="brand-sub">Process Manager Dashboard</div>
                </div>

                <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-5" rounded="lg">
                  <v-icon start size="16">mdi-alert-circle-outline</v-icon>
                  {{ error }}
                </v-alert>

                <v-form @submit.prevent="handleLogin">
                  <div class="field-label">Username</div>
                  <v-text-field
                    v-model="username"
                    placeholder="Enter your username"
                    prepend-inner-icon="mdi-account-outline"
                    variant="outlined"
                    density="compact"
                    class="login-field mb-4"
                    autofocus
                    required
                  />

                  <div class="field-label">Password</div>
                  <v-text-field
                    v-model="password"
                    placeholder="Enter your password"
                    prepend-inner-icon="mdi-lock-outline"
                    :type="showPassword ? 'text' : 'password'"
                    :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                    @click:append-inner="showPassword = !showPassword"
                    variant="outlined"
                    density="compact"
                    class="login-field mb-6"
                    required
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    variant="flat"
                    size="large"
                    block
                    class="login-btn"
                    :loading="authStore.loading"
                  >
                    <v-icon size="18" class="mr-2">mdi-login</v-icon>
                    Sign In
                  </v-btn>
                </v-form>
              </div>


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
const showPassword = ref(false)

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
/* ── Page ─────────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  background: #0a0a12;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
}

/* ── Background blobs ─────────────────────────────── */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  animation: blobDrift 18s ease-in-out infinite alternate;
}

.blob-1 {
  width: 600px; height: 600px;
  background: rgba(99, 102, 241, 0.10);
  top: -160px; left: -160px;
  animation-delay: 0s;
}
.blob-2 {
  width: 400px; height: 400px;
  background: rgba(139, 92, 246, 0.07);
  bottom: -100px; right: -60px;
  animation-delay: -6s;
}
.blob-3 {
  width: 300px; height: 300px;
  background: rgba(6, 182, 212, 0.05);
  top: 40%; right: 20%;
  animation-delay: -12s;
}

@keyframes blobDrift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, 20px) scale(1.06); }
}

/* ── Wrapper ──────────────────────────────────────── */
.login-wrapper {
  position: relative;
  z-index: 1;
  animation: fadeSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Brand area ───────────────────────────────────── */
.brand-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.brand-icon {
  width: 56px;
  height: 56px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 28px rgba(99, 102, 241, 0.18);
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.02em;
  line-height: 1;
}

.brand-sub {
  font-size: 0.75rem;
  color: #475569;
  font-weight: 400;
  margin-top: -4px;
}

/* ── Card ─────────────────────────────────────────── */
.login-card {
  background: #13131f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99, 102, 241, 0.06);
  transition: border-color 0.3s ease;
}

.login-card:hover {
  border-color: rgba(99, 102, 241, 0.18);
}

/* ── Form fields ──────────────────────────────────── */
.field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 6px;
}

.login-field :deep(.v-field) {
  background: rgba(255, 255, 255, 0.03) !important;
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
}

.login-field :deep(.v-field__input) {
  font-size: 0.9rem;
  color: #e2e8f0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.login-field :deep(.v-field__prepend-inner),
.login-field :deep(.v-field__append-inner) {
  align-items: center !important;
  padding-top: 0 !important;
}

.login-field :deep(.v-field__prepend-inner .v-icon) {
  position: relative;
  left: -5px;
}

.login-field :deep(.v-field__append-inner .v-icon) {
  position: relative;
  right: -5px;
}

/* ── Sign in button ───────────────────────────────── */
.login-btn {
  height: 44px !important;
  font-size: 0.9rem !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3) !important;
  transition: box-shadow 0.2s ease, transform 0.1s ease !important;
}

.login-btn:hover {
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45) !important;
  transform: translateY(-1px);
}

.login-btn:active {
  transform: translateY(0);
}

</style>
