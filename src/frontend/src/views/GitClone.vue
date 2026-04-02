<template>
  <MainAppBar icon="mdi-source-branch" :titleIconSize="22" showBack />

  <v-main class="main-content">
    <v-container fluid class="pa-4">

      <!-- Clone Location Banner -->
      <div class="location-banner mb-4">
        <div class="location-icon">
          <v-icon size="18" color="primary">mdi-folder-arrow-down-outline</v-icon>
        </div>
        <div class="location-body">
          <div class="location-label">Clone Location</div>
          <div class="location-path">
            <span class="path-base">{{ cloneLocation || '...' }}</span>
            <template v-if="cloneFolder">
              <span class="path-sep">\</span>
              <span class="path-folder">{{ cloneFolder }}</span>
            </template>
          </div>
        </div>
      </div>

      <v-form ref="formRef" v-model="valid" @submit.prevent="handleSubmit">
        <v-row>
          <!-- LEFT: Repository Settings -->
          <v-col cols="12" md="6">
            <v-card class="form-card h-100" elevation="0">
              <v-card-title class="section-title">
                <v-icon size="18" color="primary" class="mr-2">mdi-git</v-icon>
                Repository
              </v-card-title>
              <v-divider class="card-divider" />
              <v-card-text class="pa-4">
                <div class="field-label">Clone URL <span class="required">*</span></div>
                <v-text-field
                  v-model="formData.giturl"
                  placeholder="https://github.com/user/repo.git"
                  prepend-inner-icon="mdi-link"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  @input="extractRepositoryName"
                  class="mb-3"
                />

                <div class="field-label">Branch</div>
                <v-text-field
                  v-model="formData.gitbanch"
                  placeholder="master"
                  prepend-inner-icon="mdi-source-branch"
                  variant="outlined"
                  density="compact"
                  class="mb-3"
                />

                <div class="field-label">Username <span class="required">*</span></div>
                <v-text-field
                  v-model="formData.gitusername"
                  placeholder="Git username"
                  prepend-inner-icon="mdi-account-outline"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  class="mb-3"
                />

                <div class="field-label">Password / Token <span class="required">*</span></div>
                <v-text-field
                  v-model="formData.gitpassword"
                  placeholder="Git password or access token"
                  prepend-inner-icon="mdi-lock-outline"
                  type="password"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  class="mb-3"
                />

                <div class="field-label">Clone into folder <span class="field-optional">(optional)</span></div>
                <v-text-field
                  v-model="formData.gitclonerename"
                  placeholder="Leave blank to use repo name"
                  prepend-inner-icon="mdi-folder-outline"
                  variant="outlined"
                  density="compact"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <!-- RIGHT: App Settings -->
          <v-col cols="12" md="6">
            <v-card class="form-card h-100" elevation="0">
              <v-card-title class="section-title">
                <v-icon size="18" color="primary" class="mr-2">mdi-application-cog-outline</v-icon>
                Application
              </v-card-title>
              <v-divider class="card-divider" />
              <v-card-text class="pa-4">
                <div class="field-label">App Name <span class="required">*</span></div>
                <v-text-field
                  v-model="formData.appName"
                  placeholder="myapp:3000"
                  prepend-inner-icon="mdi-tag-outline"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  hint="Format: name:port (auto-filled from repo URL + .env)"
                  class="mb-3"
                />

                <div class="field-label">Start Script <span class="required">*</span></div>
                <v-text-field
                  v-model="formData.startscript"
                  placeholder="server.js"
                  prepend-inner-icon="mdi-play-outline"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  hint="e.g. server.js or .\\src\\app.js"
                  class="mb-3"
                />

                <div class="field-label">.env File Content <span class="required">*</span></div>
                <v-textarea
                  v-model="formData.envContent"
                  placeholder="APP_PORT=3000&#10;DB_HOST=localhost&#10;..."
                  prepend-inner-icon="mdi-file-document-outline"
                  variant="outlined"
                  :rules="[rules.required]"
                  rows="9"
                  @input="extractRepositoryName"
                  no-resize
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Submit -->
        <v-row class="mt-2">
          <v-col cols="12">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="loading"
              :disabled="!valid || loading"
              class="clone-btn"
            >
              <v-icon class="mr-2">mdi-download-outline</v-icon>
              Clone &amp; Start Application
            </v-btn>
          </v-col>
        </v-row>

        <!-- Console Output -->
        <v-row v-if="consoleLog.length > 0" class="mt-2">
          <v-col cols="12">
            <v-card class="form-card" elevation="0">
              <v-card-title class="section-title">
                <v-icon size="18" color="primary" class="mr-2">mdi-console</v-icon>
                Console Output
              </v-card-title>
              <v-divider class="card-divider" />
              <v-card-text class="pa-3">
                <div class="console-log">
                  <div v-for="(log, index) in consoleLog" :key="index" class="log-line">{{ log }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-form>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const router = useRouter()
let _redirectTimer = null
onUnmounted(() => { if (_redirectTimer) clearTimeout(_redirectTimer) })
const { showAlert } = useAlert()
const formRef = ref(null)
const valid = ref(false)
const loading = ref(false)
const cloneLocation = ref('')
const consoleLog = ref([])

const formData = ref({
  giturl: '',
  gitbanch: 'master',
  gitusername: '',
  gitpassword: '',
  gitclonerename: '',
  envContent: '',
  appName: '',
  startscript: 'server.js'
})

const cloneFolder = computed(() => {
  if (formData.value.gitclonerename) return formData.value.gitclonerename
  const match = formData.value.giturl.match(/\/([^\/]+?)(?:\.git)?$/)
  return match ? match[1] : null
})

const rules = {
  required: value => !!value || 'This field is required'
}

const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString()
  consoleLog.value.push(`[${timestamp}] ${message}`)
}

const extractRepositoryName = () => {
  const url = formData.value.giturl
  const envContent = formData.value.envContent
  const repoMatch = url.match(/\/([^\/]+)\.git$/)
  if (repoMatch && repoMatch.length > 1) {
    const repoName = repoMatch[1]
    const portRegex = /(APP_PORT_HTTP|APP_PORT_HTTPS|APP_PORT|SOAP_PORT)=(\d+)/g
    const portNumbers = []
    let match
    while ((match = portRegex.exec(envContent)) !== null) {
      if (match[2] && match[1] !== 'MONGODB_PORT') portNumbers.push(match[2])
    }
    const portString = portNumbers.length > 0 ? ':' + portNumbers.join(',') : ''
    formData.value.appName = repoName + portString
  }
}

const handleSubmit = async () => {
  if (!valid.value) return
  consoleLog.value = []
  loading.value = true
  try {
    addLog('Starting git clone process...')
    addLog(`Repository: ${formData.value.giturl}`)
    addLog(`Branch: ${formData.value.gitbanch || 'master'}`)
    addLog(`App Name: ${formData.value.appName}`)
    const payload = {
      gitUrl: formData.value.giturl,
      gitUsername: formData.value.gitusername,
      gitPassword: formData.value.gitpassword,
      tofolder: formData.value.gitclonerename || '',
      branch: formData.value.gitbanch || 'master',
      envContent: formData.value.envContent,
      appName: formData.value.appName,
      startScript: formData.value.startscript
    }
    addLog('Sending request to server...')
    const response = await api.gitClone(payload)
    if (response.data.success) {
      addLog('✓ Repository cloned successfully!')
      addLog('✓ Environment file created')
      addLog('✓ Application started with PM2')
      addLog('Redirecting to dashboard...')
      showAlert('Repository cloned and application started successfully!', 'success')
      _redirectTimer = setTimeout(() => router.push('/apps'), 2000)
    } else {
      addLog(`✗ Error: ${response.data.error || response.data.message}`)
      showAlert(response.data.error || response.data.message || 'Failed to clone repository', 'error')
    }
  } catch (error) {
    addLog(`✗ Error: ${error.response?.data?.error || error.response?.data?.message || error.message}`)
    showAlert(error.response?.data?.error || error.response?.data?.message || 'Error cloning repository', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const response = await api.getDashboard()
    if (response.data.success && response.data.data.cwd) {
      cloneLocation.value = response.data.data.cwd
    }
  } catch {}
})
</script>

<style scoped>
.main-content {
  background: #0d0d14;
  min-height: 100vh;
}

/* Clone location banner */
.location-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 10px;
  padding: 14px 18px;
}
.location-icon {
  width: 38px;
  height: 38px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.location-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #6366f1;
  margin-bottom: 4px;
}
.location-path {
  font-family: 'Courier New', monospace;
  font-size: 0.88rem;
  line-height: 1.4;
  word-break: break-all;
}
.path-base { color: #94a3b8; }
.path-sep  { color: #475569; margin: 0 1px; }
.path-folder { color: #a5b4fc; font-weight: 600; }

.form-card {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
}

.section-title {
  font-size: 0.85rem !important;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: 0;
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.card-divider {
  border-color: rgba(255, 255, 255, 0.07) !important;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 4px;
}
.field-optional {
  font-weight: 400;
  color: #475569;
}

.required { color: #ef4444; }

.clone-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
  height: 48px !important;
}

.console-log {
  background: #080810;
  border-radius: 6px;
  padding: 12px;
  max-height: 280px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

.log-line {
  color: #94a3b8;
  padding: 2px 0;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
