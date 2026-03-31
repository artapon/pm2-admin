<template>
  <MainAppBar 
    :title="appName" 
    icon="mdi-application" 
    :titleIconSize="24" 
    showBack 
    @refresh="loadAppData" 
  />

  <v-main class="main-content">
    <!-- Alert at top of body with full width -->
    <v-alert
      v-if="alert.show"
      :type="alert.type"
      variant="tonal"
      closable
      @click:close="alert.show = false"
      class="ma-0 rounded-0 success-alert mt-3"
      style="width: 100%;"
    >
      {{ alert.message }}
    </v-alert>
    <v-container fluid class="pa-6">
      <!-- Initial Loading State -->
      <div v-if="loading && !app" class="d-flex flex-column justify-center align-center" style="min-height: 400px;">
        <v-progress-circular indeterminate color="primary" size="64" class="mb-4"></v-progress-circular>
        <div class="text-h6 text-medium-emphasis">Loading application data...</div>
      </div>

      <div v-if="app">
      <!-- Detail Panel Toggle -->
      <v-row class="mb-2">
        <v-col cols="12" class="d-flex justify-end">
          <v-btn
            size="small"
            variant="outlined"
            @click="showDetails = !showDetails"
            class="toggle-details-btn"
          >
            <v-icon class="mr-1" size="18">{{ showDetails ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
            {{ showDetails ? 'Hide' : 'Show' }} Details
          </v-btn>
        </v-col>
      </v-row>

      <!-- App Status Card -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-card class="status-card glass-card" elevation="0" :loading="loading">
            <template v-slot:loader="{ isActive }">
              <v-progress-linear
                :active="isActive"
                color="primary"
                height="4"
                indeterminate
              ></v-progress-linear>
            </template>
            <v-card-title class="pa-5 d-flex align-center">
              <v-icon class="mr-3" size="32" color="primary">mdi-application</v-icon>
              <div class="flex-grow-1">
                <div class="text-h5 font-weight-bold">{{ app.name }}</div>
                <div class="text-caption text-medium-emphasis" v-if="app.env">Environment: {{ app.env }}</div>
              </div>
              <v-chip
                :color="getStatusColor(app.status)"
                variant="flat"
                size="large"
                class="font-weight-bold"
              >
                <v-icon start>{{ getStatusIcon(app.status) }}</v-icon>
                {{ app.status }}
              </v-chip>
            </v-card-title>
            
            <v-divider v-if="showDetails"></v-divider>
            
            <v-card-text class="pa-5" v-if="showDetails">
              <v-row>
                <!-- CPU -->
                <v-col cols="12" sm="6" md="3">
                  <div class="metric-box">
                    <div class="metric-icon-small cpu-icon">
                      <v-icon size="20" color="info">mdi-cpu-64-bit</v-icon>
                    </div>
                    <div class="ml-3">
                      <div class="text-caption text-medium-emphasis">CPU Usage</div>
                      <div class="text-h6 font-weight-bold">{{ app.cpu }}%</div>
                    </div>
                  </div>
                </v-col>
                
                <!-- Memory -->
                <v-col cols="12" sm="6" md="3">
                  <div class="metric-box">
                    <div class="metric-icon-small memory-icon">
                      <v-icon size="20" color="success">mdi-memory</v-icon>
                    </div>
                    <div class="ml-3">
                      <div class="text-caption text-medium-emphasis">Memory</div>
                      <div class="text-h6 font-weight-bold">{{ formatBytes(app.memory) }}</div>
                    </div>
                  </div>
                </v-col>
                
                <!-- Restarts -->
                <v-col cols="12" sm="6" md="3">
                  <div class="metric-box">
                    <div class="metric-icon-small restart-icon">
                      <v-icon size="20" color="warning">mdi-restart</v-icon>
                    </div>
                    <div class="ml-3">
                      <div class="text-caption text-medium-emphasis">Restarts</div>
                      <div class="text-h6 font-weight-bold">{{ app.restarts || 0 }}</div>
                    </div>
                  </div>
                </v-col>
                
                <!-- Uptime -->
                <v-col cols="12" sm="6" md="3">
                  <div class="metric-box">
                    <div class="metric-icon-small uptime-icon">
                      <v-icon size="20" color="primary">mdi-clock-outline</v-icon>
                    </div>
                    <div class="ml-3">
                      <div class="text-caption text-medium-emphasis">Uptime</div>
                      <div class="text-body-2 font-weight-medium">{{ app.uptime }}</div>
                    </div>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- Additional Info -->
              <v-row dense>
                <v-col cols="12" md="6" v-if="app.restart_time">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="primary">mdi-restart</v-icon>
                    <span class="text-caption text-medium-emphasis">Restart Time:</span>
                    <span class="ml-2 font-weight-medium">{{ app.restart_time }}</span>
                  </div>
                </v-col>
                
                <v-col cols="12" md="6" v-if="app.node_version">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="success">mdi-nodejs</v-icon>
                    <span class="text-caption text-medium-emphasis">Node Version:</span>
                    <span class="ml-2 font-weight-medium">{{ app.node_version }}</span>
                  </div>
                </v-col>
                
                <v-col cols="12" v-if="app.exec_path">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="info">mdi-console</v-icon>
                    <span class="text-caption text-medium-emphasis">Exec Path:</span>
                    <span class="ml-2 font-weight-medium text-truncate">{{ app.exec_path }}</span>
                  </div>
                </v-col>
                
                <v-col cols="12" v-if="app.node_args && app.node_args.length > 0">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="info">mdi-code-tags</v-icon>
                    <span class="text-caption text-medium-emphasis">Node Args:</span>
                    <span class="ml-2 font-weight-medium">{{ app.node_args }}</span>
                  </div>
                </v-col>
                
                <v-col cols="12" md="6" v-if="app.git_branch">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="warning">mdi-source-branch</v-icon>
                    <span class="text-caption text-medium-emphasis">Git Branch:</span>
                    <span class="ml-2 font-weight-medium">{{ app.git_branch }}</span>
                  </div>
                </v-col>
                
                <v-col cols="12" md="6" v-if="app.git_commit">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="warning">mdi-source-commit</v-icon>
                    <span class="text-caption text-medium-emphasis">Git Commit:</span>
                    <span class="ml-2 font-weight-medium">{{ app.git_commit }}</span>
                  </div>
                </v-col>
                
                <v-col cols="12" md="6" v-if="app.port_http">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="primary">mdi-web</v-icon>
                    <span class="text-caption text-medium-emphasis">HTTP URL:</span>
                    <a :href="`http://${app.app_base_url}:${app.port_http}`" target="_blank" class="ml-2 font-weight-medium">
                      http://{{app.app_base_url}}:{{app.port_http}}
                    </a>
                  </div>
                </v-col>
                
                <v-col cols="12" md="6" v-if="app.port_https">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="success">mdi-lock</v-icon>
                    <span class="text-caption text-medium-emphasis">HTTPS URL:</span>
                    <a :href="`https://${app.app_base_url}:${app.port_https}`" target="_blank" class="ml-2 font-weight-medium">
                      https://{{app.app_base_url}}:{{app.port_https}}
                    </a>
                  </div>
                </v-col>
                
                <v-col cols="12" v-if="docUrl">
                  <div class="info-item">
                    <v-icon size="20" class="mr-2" color="info">mdi-file-document</v-icon>
                    <span class="text-caption text-medium-emphasis">API Docs:</span>
                    <a :href="docUrl" target="_blank" class="ml-2 font-weight-medium">
                      {{ docUrl }}
                    </a>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions v-if="authStore.role === 'root'" class="pa-5">
              <v-btn
                v-if="!app.name.includes('pm2')"
                color="secondary"
                variant="flat"
                @click="confirmFlushLogs"
                class="action-btn mr-2"
              >
                <v-icon class="mr-2">mdi-delete-sweep</v-icon>
                Flush Logs
              </v-btn>
              <v-btn
                v-if="app.status === 'online'"
                color="success"
                variant="flat"
                @click="reloadApp"
                class="action-btn mr-2"
              >
                <v-icon class="mr-2">mdi-reload</v-icon>
                Reload
              </v-btn>
              <v-btn
                color="warning"
                variant="flat"
                @click="confirmRestart"
                class="action-btn mr-2"
              >
                <v-icon class="mr-2">mdi-restart</v-icon>
                Restart
              </v-btn>
              <v-btn
                v-if="app.status === 'online' && !app.name.includes('pm2')"
                color="error"
                variant="flat"
                @click="stopApp"
                class="action-btn mr-2"
              >
                <v-icon class="mr-2">mdi-stop</v-icon>
                Stop
              </v-btn>
              <v-btn
                v-if="!app.name.includes('pm2') && (app.status === 'stopped' || app.status === 'errored')"
                color="error"
                variant="flat"
                @click="confirmDelete"
                class="action-btn"
              >
                <v-icon class="mr-2">mdi-delete</v-icon>
                Delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Logs and Environment Panels -->
      <v-row>
        <!-- Environment Panel (Left) -->
        <v-col v-if="authStore.role === 'root'" cols="12" md="4">
          <v-card class="env-card glass-card" elevation="0">
            <v-tabs v-model="envTab" bg-color="transparent" color="primary" density="compact">
              <v-tab value="current">Current .env</v-tab>
              <v-tab value="backup" v-if="envBackup">Old .env</v-tab>
              <v-tab value="edit">Update .env</v-tab>
            </v-tabs>
            <v-divider></v-divider>
            <v-card-text class="pa-4">
              <v-window v-model="envTab">
                <v-window-item value="current">
                  <v-textarea
                    :model-value="envContent"
                    variant="outlined"
                    rows="28"
                    readonly
                    class="env-textarea"
                    hide-details
                  ></v-textarea>
                </v-window-item>
                <v-window-item value="backup" v-if="envBackup">
                  <v-textarea
                    :model-value="envBackup"
                    variant="outlined"
                    rows="28"
                    readonly
                    class="env-textarea"
                    hide-details
                  ></v-textarea>
                </v-window-item>
                <v-window-item value="edit">
                  <v-alert v-if="authStore.role === 'root'" type="warning" variant="tonal" density="compact" class="mb-3">
                    Please restart application after .env updated.
                  </v-alert>
                  <v-alert v-else type="info" variant="tonal" density="compact" class="mb-3">
                    View-only mode: You cannot update environment variables.
                  </v-alert>
                  <v-textarea
                    v-model="envEdit"
                    variant="outlined"
                    rows="23"
                    class="env-textarea"
                    hide-details
                    :readonly="authStore.username === 'itadmin'"
                  ></v-textarea>
                  <v-btn
                    v-if="authStore.role === 'root'"
                    color="primary"
                    variant="flat"
                    block
                    class="mt-3"
                    @click="updateEnv"
                    :disabled="!envEdit || envEdit === envContent"
                  >
                    <v-icon class="mr-2">mdi-content-save</v-icon>
                    Update
                  </v-btn>
                </v-window-item>
              </v-window>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Logs Panel (Right) -->
        <v-col cols="12" :md="authStore.role === 'root' ? 8 : 12">
          <v-card class="logs-card glass-card" elevation="0" :loading="loading">
            <template v-slot:loader="{ isActive }">
              <v-progress-linear
                :active="isActive"
                color="primary"
                height="4"
                indeterminate
              ></v-progress-linear>
            </template>
            <v-card-title class="pa-4 d-flex align-center">
              <span class="text-h6 font-weight-bold">Application Logs</span>
              <v-spacer></v-spacer>
              <v-btn-toggle v-model="logType" mandatory color="primary" density="compact">
                <v-btn value="stdout" size="small" style="height: 31px;">
                  <v-icon size="16" class="mr-1">mdi-console</v-icon>
                  Output
                </v-btn>
                <v-btn value="stderr" size="small" style="height: 31px;">
                  <v-icon size="16" class="mr-1">mdi-alert-circle</v-icon>
                  Error
                </v-btn>
              </v-btn-toggle>
              <v-btn
                size="small"
                color="info"
                variant="flat"
                :href="`/apps/${appName}/${logType === 'stdout' ? 'outlog' : 'errorlog'}/download`"
                target="_blank"
                class="ml-2"
                style="height: 31px;"
              >
                <v-icon size="16" class="mr-1">mdi-download</v-icon>
                Download
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-0">
              <div :class="['log-container', logType === 'stderr' ? 'error-log' : 'output-log']">
                <div class="log-content" v-html="formattedLogs"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      </div>
    </v-container>

    <!-- Footer -->
    <v-footer class="footer-gradient text-center pa-4 mt-8">
      <div class="w-100">
        <div class="text-body-2">
          PM2 Services Monitor © {{ new Date().getFullYear() }}
        </div>
      </div>
    </v-footer>
  </v-main>

  <!-- Delete Confirmation Dialog -->
  <v-dialog v-model="deleteDialog" max-width="500">
    <v-card class="dialog-card">
      <v-card-title class="pa-5 pb-3 d-flex align-center">
        <v-icon class="mr-2" color="error">mdi-alert</v-icon>
        Confirm Delete
      </v-card-title>
      <v-card-text class="pt-4">
        <p class="text-body-1">Are you sure you want to delete <strong>{{ appName }}</strong>?</p>
        <p class="text-body-2 text-medium-emphasis">This action will permanently remove the PM2 process from the process list.</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="deleteDialog = false">Cancel</v-btn>
        <v-btn color="error" variant="flat" @click="deleteApp">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Restart with Rename Dialog -->
  <v-dialog v-model="restartDialog" max-width="500">
    <v-card class="dialog-card">
      <v-card-title class="pa-5 pb-3 d-flex align-center">
        <v-icon class="mr-2" color="warning">mdi-restart</v-icon>
        Restart Application
      </v-card-title>
      <v-card-text class="pt-4">
        <p class="text-body-2 mb-3">You can optionally change the application name during restart.</p>
        <v-text-field
          v-model="newAppName"
          label="Application Name"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          hide-details="auto"
        ></v-text-field>
        <v-text-field
          v-model="nodeArgsEdit"
          label="Node Arguments"
          variant="outlined"
          density="comfortable"
          placeholder="e.g. --expose-gc --max-old-space-size=1024"
          hide-details="auto"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="restartDialog = false">Cancel</v-btn>
        <v-btn color="warning" variant="flat" @click="restartApp" :disabled="!newAppName">Restart</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Flush Confirmation Dialog -->
  <v-dialog v-model="flushDialog" max-width="500">
    <v-card class="dialog-card">
      <v-card-title class="pa-5 pb-3 d-flex align-center">
        <v-icon class="mr-2" color="secondary">mdi-delete-sweep</v-icon>
        Confirm Flush Logs
      </v-card-title>
      <v-card-text class="pt-4">
        <p class="text-body-1">Are you sure you want to flush all logs for <strong>{{ appName }}</strong>?</p>
        <p class="text-body-2 text-medium-emphasis">This action will clear both standard output and error log files. This cannot be undone.</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="flushDialog = false">Cancel</v-btn>
        <v-btn color="secondary" variant="flat" @click="flushLogs">Flush</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const appName = ref(route.params.appName)
const app = ref(null)
const logs = ref({ stdout: '', stderr: '' })
const envContent = ref('')
const envBackup = ref('')
const envEdit = ref('')
const logType = ref('stdout')
const envTab = ref('current')
const showDetails = ref(true)
const loading = ref(false)

const alert = ref({
  show: false,
  type: 'success',
  message: ''
})
const deleteDialog = ref(false)
const restartDialog = ref(false)
const flushDialog = ref(false)
const newAppName = ref('')
const nodeArgsEdit = ref('')

const docUrl = computed(() => {
  if (!app.value || (!app.value.port_http && !app.value.port_https)) return null
  const port = app.value.port_http || app.value.port_https
  const protocol = app.value.port_http ? 'http' : 'https'
  const baseUrl = `${protocol}://${app.value.app_base_url}:${port}`
  return app.value.name.includes('sap') ? `${baseUrl}/v1/docs/` : `${baseUrl}/docs/api/v1/`
})

const formattedLogs = computed(() => {
  const logContent = logs.value[logType.value] || 'No logs available'
  return logContent.replace(/\n/g, '<br>')
})

const loadAppData = async () => {
  loading.value = true
  try {
    const response = await api.getApp(appName.value)
    if (response.data.success) {
      app.value = response.data.data.app
      logs.value.stdout = response.data.data.logs.stdout.lines || 'No logs available'
      logs.value.stderr = response.data.data.logs.stderr.lines || 'No logs available'
      envContent.value = response.data.data.app.env_file_raw || ''
      envBackup.value = response.data.data.app.env_file_raw_backup || ''
      envEdit.value = response.data.data.app.env_file_raw || ''
    }
  } catch (error) {
    console.error('Failed to load app data:', error)
    showAlert('Failed to load app data', 'error')
  } finally {
    loading.value = false
  }
}

const updateEnv = async () => {
  try {
    await api.updateAppEnv(appName.value, envEdit.value)
    showAlert('Environment updated successfully. Please restart the application.', 'success')
    loadAppData()
    envTab.value = 'current'
  } catch (error) {
    showAlert('Failed to update environment', 'error')
  }
}

const reloadApp = async () => {
  try {
    await api.reloadApp(appName.value)
    showAlert('App reloaded successfully', 'success')
    loadAppData()
  } catch (error) {
    showAlert('Failed to reload app', 'error')
  }
}

const confirmRestart = () => {
  newAppName.value = appName.value
  nodeArgsEdit.value = Array.isArray(app.value.node_args) ? app.value.node_args.join(' ') : (app.value.node_args || '')
  restartDialog.value = true
}

const restartApp = async () => {
  try {
    const oldName = appName.value
    await api.restartAppWithRename(oldName, newAppName.value, nodeArgsEdit.value)
    showAlert(`App restarted successfully with name: ${newAppName.value}`, 'success')
    restartDialog.value = false
    // Update appName if it changed
    if (oldName !== newAppName.value) {
      appName.value = newAppName.value
      router.replace(`/apps/${newAppName.value}`)
    }
    loadAppData()
  } catch (error) {
    showAlert('Failed to restart app', 'error')
    restartDialog.value = false
  }
}

const stopApp = async () => {
  try {
    await api.stopApp(appName.value)
    showAlert('App stopped successfully', 'success')
    loadAppData()
  } catch (error) {
    showAlert('Failed to stop app', 'error')
  }
}

const confirmFlushLogs = () => {
  flushDialog.value = true
}

const flushLogs = async () => {
  try {
    await api.flushAppLogs(appName.value)
    showAlert('Logs flushed successfully', 'success')
    flushDialog.value = false
    loadAppData()
  } catch (error) {
    showAlert('Failed to flush logs', 'error')
    flushDialog.value = false
  }
}

const confirmDelete = () => {
  deleteDialog.value = true
}

const deleteApp = async () => {
  try {
    await api.deleteApp(appName.value)
    showAlert('App deleted successfully', 'success')
    deleteDialog.value = false
    setTimeout(() => {
      router.push('/apps')
    }, 1500)
  } catch (error) {
    showAlert('Failed to delete app', 'error')
    deleteDialog.value = false
  }
}

const goBack = () => {
  router.push('/apps')
}

const getStatusColor = (status) => {
  switch (status) {
    case 'online': return 'success'
    case 'stopped': return 'warning'
    case 'errored': return 'error'
    default: return 'grey'
  }
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'online': return 'mdi-check-circle'
    case 'stopped': return 'mdi-stop-circle'
    case 'errored': return 'mdi-alert-circle'
    default: return 'mdi-help-circle'
  }
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = Math.round(bytes / Math.pow(k, i) * 100) / 100
  if (isNaN(value)) return '0 B'
  return value + ' ' + sizes[i]
}

const showAlert = (message, type = 'success') => {
  alert.value.message = message
  alert.value.type = type
  alert.value.show = true
  setTimeout(() => {
    alert.value.show = false
  }, 5000)
}

onMounted(() => {
  loadAppData()
})
</script>

<style scoped>
.app-bar-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
}

.main-content {
  background: #0d0d14;
  min-height: 100vh;
}

.status-card, .logs-card, .env-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.metric-box {
  display: flex;
  align-items: flex-start;
}

.metric-icon-small {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cpu-icon {
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.2);
}

.memory-icon {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.restart-icon {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.uptime-icon {
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.action-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.log-container {
  height: 600px;
  overflow-y: auto;
  padding: 16px;
}

.output-log {
  background: #0d0d14;
}

.error-log {
  background: #0d0d14;
}

.log-content {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #e2e8f0;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
}

.env-textarea :deep(.v-field__input) {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

.footer-gradient {
  background: #0d0d14 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.07) !important;
  color: #64748b;
}

.footer-link {
  color: white;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s ease;
}

.footer-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.success-alert {
  background: rgb(var(--v-theme-success)) !important;
  color: white !important;
}

.success-alert :deep(.v-alert__close) {
  color: white !important;
}

.toggle-details-btn {
  text-transform: none;
  font-weight: 500;
  border-color: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  transition: border-color 0.2s ease;
}

.toggle-details-btn:hover {
  border-color: rgba(99, 102, 241, 0.4);
  background-color: rgba(99, 102, 241, 0.08);
}

.dialog-card {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
}
</style>
