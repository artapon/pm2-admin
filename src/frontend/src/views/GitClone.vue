<template>
  <MainAppBar 
    title="Git Clone" 
    icon="mdi-git" 
    :titleIconSize="24" 
    showBack 
  />

  <v-main class="main-content">
    <v-container fluid class="pa-6">
      <v-row justify="center">
        <v-col cols="12" md="8" lg="6">
          <v-card class="git-clone-card glass-card fade-in" elevation="0">
            <v-card-title class="pa-5">
              <span class="text-h6 font-weight-bold">Clone Git Repository</span>
            </v-card-title>
            <v-card-text class="pa-5">
              <v-form ref="formRef" v-model="valid" @submit.prevent="handleSubmit">
                <v-alert v-if="authStore.username === 'itadmin'" type="error" variant="tonal" class="mb-4">
                  <v-icon start>mdi-alert-octagon</v-icon>
                  <strong>View-only mode:</strong> You do not have permission to clone repositories.
                </v-alert>
                <v-alert type="info" variant="tonal" class="mb-4">
                  <div class="text-body-2">Clone Location: <strong>{{ cloneLocation }}</strong></div>
                </v-alert>

                <v-text-field
                  v-model="formData.giturl"
                  label="Clone with HTTPS"
                  prepend-inner-icon="mdi-git"
                  variant="outlined"
                  :rules="[rules.required]"
                  @input="extractRepositoryName"
                  class="mb-4"
                  required
                ></v-text-field>

                <v-text-field
                  v-model="formData.gitbanch"
                  label="Branch"
                  prepend-inner-icon="mdi-source-branch"
                  variant="outlined"
                  hint="Default: master"
                  class="mb-4"
                ></v-text-field>

                <v-text-field
                  v-model="formData.gitusername"
                  label="Git Username"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  :rules="[rules.required]"
                  class="mb-4"
                  required
                ></v-text-field>

                <v-text-field
                  v-model="formData.gitpassword"
                  label="Git Password"
                  prepend-inner-icon="mdi-lock"
                  type="password"
                  variant="outlined"
                  :rules="[rules.required]"
                  class="mb-4"
                  required
                ></v-text-field>

                <v-text-field
                  v-model="formData.gitclonerename"
                  label="Rename Folder To (Optional)"
                  prepend-inner-icon="mdi-folder"
                  variant="outlined"
                  class="mb-4"
                ></v-text-field>

                <v-textarea
                  v-model="formData.envContent"
                  label=".env File Content"
                  prepend-inner-icon="mdi-file-document"
                  variant="outlined"
                  :rules="[rules.required]"
                  rows="8"
                  @input="extractRepositoryName"
                  class="mb-4"
                  required
                ></v-textarea>

                <v-text-field
                  v-model="formData.appName"
                  label="App Name"
                  prepend-inner-icon="mdi-application"
                  variant="outlined"
                  :rules="[rules.required]"
                  hint="Example: example:port"
                  class="mb-4"
                  required
                ></v-text-field>

                <v-text-field
                  v-model="formData.startscript"
                  label="Start Script"
                  prepend-inner-icon="mdi-play"
                  variant="outlined"
                  :rules="[rules.required]"
                  hint="Example: server.js, .\\src\\app.js"
                  class="mb-4"
                  required
                ></v-text-field>

                <v-btn
                  type="submit"
                  color="warning"
                  size="large"
                  block
                  :loading="loading"
                  :disabled="!valid || loading || authStore.username === 'itadmin'"
                  class="clone-btn"
                >
                  <v-icon class="mr-2">mdi-download</v-icon>
                  Clone & Start Application
                </v-btn>

                <!-- Console Log -->
                <v-card v-if="consoleLog.length > 0" class="mt-4" elevation="0" variant="outlined">
                  <v-card-title class="pa-3 text-body-2">
                    <v-icon class="mr-2" size="20">mdi-console</v-icon>
                    Console Output
                  </v-card-title>
                  <v-divider></v-divider>
                  <v-card-text class="pa-3">
                    <div class="console-log">
                      <div v-for="(log, index) in consoleLog" :key="index" class="log-line">
                        {{ log }}
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="5000" location="top">
      {{ snackbarText }}
    </v-snackbar>
  </v-main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const valid = ref(false)
const loading = ref(false)
const cloneLocation = ref('')

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
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
  
  // Extract repository name from URL
  const repoMatch = url.match(/\/([^\/]+)\.git$/)
  if (repoMatch && repoMatch.length > 1) {
    const repoName = repoMatch[1]
    
    // Extract port numbers from env content
    const portRegex = /(APP_PORT_HTTP|APP_PORT_HTTPS|APP_PORT|SOAP_PORT)=(\d+)/g
    const portNumbers = []
    let match
    
    while ((match = portRegex.exec(envContent)) !== null) {
      const portName = match[1]
      const portNumber = match[2]
      
      if (portNumber && portName !== 'MONGODB_PORT') {
        portNumbers.push(portNumber)
      }
    }
    
    const portString = portNumbers.length > 0 ? ':' + portNumbers.join(',') : ''
    formData.value.appName = repoName + portString
  }
}

const handleSubmit = async () => {
  if (!valid.value) return
  
  // Clear previous logs
  consoleLog.value = []
  loading.value = true
  
  try {
    addLog('Starting git clone process...')
    addLog(`Repository: ${formData.value.giturl}`)
    addLog(`Branch: ${formData.value.gitbanch || 'master'}`)
    addLog(`App Name: ${formData.value.appName}`)
    
    // Map form data to match backend API expectations
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
      showSnackbar('Repository cloned and application started successfully!', 'success')
      setTimeout(() => {
        router.push('/apps')
      }, 2000)
    } else {
      addLog(`✗ Error: ${response.data.error || response.data.message}`)
      showSnackbar(response.data.error || response.data.message || 'Failed to clone repository', 'error')
    }
  } catch (error) {
    console.error('Git clone error:', error)
    addLog(`✗ Error: ${error.response?.data?.error || error.response?.data?.message || error.message}`)
    showSnackbar(error.response?.data?.error || error.response?.data?.message || 'Error cloning repository', 'error')
  } finally {
    loading.value = false
  }
}

const showSnackbar = (text, color = 'success') => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const goBack = () => {
  router.push('/apps')
}

onMounted(async () => {
  // Get clone location from server
  try {
    const response = await api.getDashboard()
    if (response.data.success && response.data.data.cwd) {
      cloneLocation.value = response.data.data.cwd
    }
  } catch (error) {
    console.error('Failed to get clone location:', error)
  }
})
</script>

<style scoped>
.main-content {
  background: #0d0d14;
  min-height: 100vh;
}

.git-clone-card {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
}

.clone-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.console-log {
  background: #0d0d14;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
}

.log-line {
  color: #94a3b8;
  padding: 3px 0;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
