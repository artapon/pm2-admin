<template>
  <MainAppBar @refresh="loadDashboard" />

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
        <!-- Metric Cards Toggle -->
        <v-row class="mb-2">
          <v-col cols="12" class="d-flex justify-end">
            <v-btn
              size="small"
              variant="outlined"
              @click="showMetrics = !showMetrics"
              class="toggle-metrics-btn"
            >
              <v-icon class="mr-1" size="18">{{ showMetrics ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
              {{ showMetrics ? 'Hide' : 'Show' }} Metrics
            </v-btn>
          </v-col>
        </v-row>

        <!-- Application Status Cards -->
        <v-row class="mb-4" v-if="showMetrics">
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.05s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-2">
                  <div class="metric-icon success-icon">
                    <v-icon size="24" color="white">mdi-check-circle</v-icon>
                  </div>
                  <div class="ml-3">
                    <div class="text-caption text-medium-emphasis">ONLINE</div>
                    <div class="text-h3 font-weight-bold text-success">{{ onlineCount }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.1s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-2">
                  <div class="metric-icon warning-icon">
                    <v-icon size="24" color="white">mdi-stop-circle</v-icon>
                  </div>
                  <div class="ml-3">
                    <div class="text-caption text-medium-emphasis">STOPPED</div>
                    <div class="text-h3 font-weight-bold text-warning">{{ stoppedCount }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.15s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-2">
                  <div class="metric-icon error-icon">
                    <v-icon size="24" color="white">mdi-alert-circle</v-icon>
                  </div>
                  <div class="ml-3">
                    <div class="text-caption text-medium-emphasis">ERRORED</div>
                    <div class="text-h3 font-weight-bold text-error">{{ erroredCount }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Server Info Row -->
        <v-row class="mb-4" v-if="serverInfo && showMetrics">
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.2s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-2">
                  <div class="metric-icon node-icon">
                    <v-icon size="20" color="white">mdi-nodejs</v-icon>
                  </div>
                  <div class="ml-3 flex-grow-1">
                    <div class="text-caption text-medium-emphasis">Node Version</div>
                    <div class="text-body-1 font-weight-bold">{{ nodeVersion }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.25s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-2">
                  <div class="metric-icon os-icon">
                    <v-icon size="20" color="white">mdi-desktop-tower</v-icon>
                  </div>
                  <div class="ml-3 flex-grow-1">
                    <div class="text-caption text-medium-emphasis">Operating System</div>
                    <div class="text-body-2 font-weight-medium">{{ serverInfo.osinfo }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.3s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-2">
                  <div class="metric-icon time-icon">
                    <v-icon size="20" color="white">mdi-clock-outline</v-icon>
                  </div>
                  <div class="ml-3 flex-grow-1">
                    <div class="text-caption text-medium-emphasis">Server Time</div>
                    <div class="text-body-2 font-weight-medium">{{ serverInfo.timeinfo }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- System Metrics Row -->
        <v-row v-if="serverInfo && showMetrics" class="mb-4">
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.35s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-3">
                  <div class="metric-icon cpu-icon">
                    <v-icon size="24" color="white">mdi-cpu-64-bit</v-icon>
                  </div>
                  <div class="ml-3 flex-grow-1">
                    <div class="text-caption text-medium-emphasis">CPU Usage</div>
                    <div class="text-h4 font-weight-bold">{{ serverInfo.currentCPU }}%</div>
                  </div>
                </div>
                <div class="text-caption mb-2">{{ serverInfo.cpuInfo }}</div>
                <v-progress-linear
                  :model-value="serverInfo.currentCPU"
                  :color="getProgressColor(serverInfo.currentCPU)"
                  height="6"
                  rounded
                ></v-progress-linear>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.4s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-3">
                  <div class="metric-icon memory-icon">
                    <v-icon size="24" color="white">mdi-memory</v-icon>
                  </div>
                  <div class="ml-3 flex-grow-1">
                    <div class="text-caption text-medium-emphasis">Memory</div>
                    <div class="text-h4 font-weight-bold">{{ serverInfo.memPercent }}%</div>
                  </div>
                </div>
                <div class="text-caption mb-2">{{ serverInfo.memused }} / {{ serverInfo.memtotal }}</div>
                <v-progress-linear
                  :model-value="serverInfo.memPercent"
                  :color="getProgressColor(serverInfo.memPercent)"
                  height="6"
                  rounded
                ></v-progress-linear>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="metric-card glass-card fade-in" elevation="0" style="animation-delay: 0.45s">
              <v-card-text class="pa-5">
                <div class="d-flex align-center mb-3">
                  <div class="metric-icon disk-icon">
                    <v-icon size="24" color="white">mdi-harddisk</v-icon>
                  </div>
                  <div class="ml-3 flex-grow-1">
                    <div class="text-caption text-medium-emphasis">Disk {{ serverInfo.diskfs }}</div>
                    <div class="text-h4 font-weight-bold">{{ serverInfo.diskPercent }}%</div>
                  </div>
                </div>
                <div class="text-caption mb-2">{{ serverInfo.diskUsed }} / {{ serverInfo.diskTotal }}</div>
                <v-progress-linear
                  :model-value="serverInfo.diskPercent"
                  :color="getProgressColor(serverInfo.diskPercent)"
                  height="6"
                  rounded
                ></v-progress-linear>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Apps Table -->
        <v-row>
          <v-col cols="12">
            <v-card class="apps-table-card glass-card fade-in" elevation="0" style="animation-delay: 0.5s">
              <v-card-title class="pa-5 d-flex align-center">
                <span class="text-h6 font-weight-bold">Applications</span>
                <v-spacer></v-spacer>
                <v-text-field
                  v-model="search"
                  prepend-inner-icon="mdi-magnify"
                  label="Search applications..."
                  single-line
                  hide-details
                  variant="outlined"
                  density="compact"
                  class="search-field"
                  style="max-width: 300px;"
                ></v-text-field>
              </v-card-title>
              <v-data-table
                :headers="headers"
                :items="apps"
                :search="search"
                :loading="loading"
                class="modern-table"
                hover
              >
                <template v-slot:item.name="{ item }">
                  <router-link :to="`/apps/${item.name}`" class="app-name-link font-weight-medium">
                    {{ item.name }}
                  </router-link>
                </template>
                <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="getStatusColor(item.status)"
                    variant="flat"
                    size="small"
                    class="font-weight-medium"
                  >
                    <v-icon start size="14">{{ getStatusIcon(item.status) }}</v-icon>
                    {{ item.status }}
                  </v-chip>
                </template>
                <template v-slot:item.cpu="{ item }">
                  <span class="font-weight-medium">{{ item.cpu }}%</span>
                </template>
                <template v-slot:item.memory="{ item }">
                  <span class="font-weight-medium">{{ item.memory }}</span>
                </template>
                <template v-slot:item.actions="{ item }">
                  <div v-if="authStore.role === 'root'" class="action-buttons">
                    <v-btn size="small" color="success" variant="flat" @click="handleReloadApp(item.name)" class="action-btn mr-1">
                      <v-icon size="16" class="mr-1">mdi-reload</v-icon>
                      Reload
                    </v-btn>
                    <v-btn size="small" color="warning" variant="flat" @click="confirmSimpleRestart(item.name)" class="action-btn mr-1">
                      <v-icon size="16" class="mr-1">mdi-restart</v-icon>
                      Restart
                    </v-btn>
                    <v-btn v-if="!item.name.includes('pm2') && item.status === 'online'" size="small" color="error" variant="flat" @click="confirmStop(item.name)" class="action-btn mr-1">
                      <v-icon size="16" class="mr-1">mdi-stop</v-icon>
                      Stop
                    </v-btn>
                    <v-btn v-if="!item.name.includes('pm2') && (item.status === 'stopped' || item.status === 'errored')" size="small" color="error" variant="flat" @click="confirmDelete(item.name)" class="action-btn">
                      <v-icon size="16" class="mr-1">mdi-delete</v-icon>
                      Delete
                    </v-btn>
                  </div>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>
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

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top">
      {{ snackbarText }}
    </v-snackbar>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">
          <v-icon class="mr-2" color="white">mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="text-body-1">Are you sure you want to delete <strong>{{ appToDelete }}</strong>?</p>
          <p class="text-body-2 text-medium-emphasis">This action will permanently remove the PM2 process from the process list.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleDeleteApp">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Simple Restart Confirmation Dialog -->
    <v-dialog v-model="restartDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5 bg-warning text-white">
          <v-icon class="mr-2" color="white">mdi-restart</v-icon>
          Confirm Restart
        </v-card-title>
        <v-card-text class="pt-4 text-center">
          <p class="text-body-1">Are you sure you want to restart ?</p>
           <p class="text-body-1"><strong>{{ appToRestart }}</strong></p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="restartDialog = false">Cancel</v-btn>
          <v-btn color="warning" variant="flat" @click="handleSimpleRestart">Restart</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Stop Confirmation Dialog -->
    <v-dialog v-model="stopDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">
          <v-icon class="mr-2" color="white">mdi-stop</v-icon>
          Confirm Stop
        </v-card-title>
        <v-card-text class="pt-4 text-center">
          <p class="text-body-1">Are you sure you want to stop ?</p>
           <p class="text-body-1"><strong>{{ appToStop }}</strong></p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="stopDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleStopApp">Stop</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const router = useRouter()
const authStore = useAuthStore()

const apps = ref([])
const serverInfo = ref(null)
const loading = ref(false)
const search = ref('')
const onlineCount = ref(0)
const stoppedCount = ref(0)
const erroredCount = ref(0)
const nodeVersion = ref('Loading...')
const showMetrics = ref(true)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const deleteDialog = ref(false)
const appToDelete = ref('')
const restartDialog = ref(false)
const appToRestart = ref('')
const stopDialog = ref(false)
const appToStop = ref('')

const alert = ref({
  show: false,
  type: 'success',
  message: ''
})

const headers = computed(() => {
  const baseHeaders = [
    { title: 'Name', key: 'name' },
    { title: 'Status', key: 'status' },
    { title: 'CPU', key: 'cpu' },
    { title: 'Memory', key: 'memory' },
    { title: 'Restarts', key: 'restarts' },
    { title: 'Uptime', key: 'uptime' }
  ]
  
  if (authStore.role === 'root') {
    baseHeaders.push({ title: 'Actions', key: 'actions', sortable: false })
  }
  
  return baseHeaders
})

const loadDashboard = async () => {
  loading.value = true
  try {
    const response = await api.getDashboard()
    if (response.data.success) {
      apps.value = response.data.data.apps || []
      serverInfo.value = response.data.data.serverinfo
      onlineCount.value = response.data.data.onlineCount || 0
      stoppedCount.value = response.data.data.stoppedCount || 0
      erroredCount.value = response.data.data.erroredCount || 0
      nodeVersion.value = response.data.data.node?.node || 'N/A'
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error)
    if (error.response?.status === 401) {
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const handleReloadApp = async (appName) => {
  try {
    const response = await api.reloadApp(appName)
    if (response.data.success) {
      showSnackbar('App reloaded successfully', 'success')
      loadDashboard()
    }
  } catch (error) {
    showSnackbar('Failed to reload app', 'error')
  }
}

const confirmSimpleRestart = (appName) => {
  appToRestart.value = appName
  restartDialog.value = true
}

const handleSimpleRestart = async () => {
  try {
    const appName = appToRestart.value
    const response = await api.restartApp(appName)
    if (response.data.success) {
      showSnackbar(response.data.message || 'App restarted successfully', 'success')
      restartDialog.value = false
      appToRestart.value = ''
      loadDashboard()
    }
  } catch (error) {
    showSnackbar('Failed to restart app', 'error')
    restartDialog.value = false
  }
}

const confirmStop = (appName) => {
  appToStop.value = appName
  stopDialog.value = true
}

const handleStopApp = async () => {
  try {
    const appName = appToStop.value
    const response = await api.stopApp(appName)
    if (response.data.success) {
      showSnackbar('App stopped successfully', 'success')
      stopDialog.value = false
      appToStop.value = ''
      loadDashboard()
    }
  } catch (error) {
    showSnackbar('Failed to stop app', 'error')
    stopDialog.value = false
  }
}

const confirmDelete = (appName) => {
  appToDelete.value = appName
  deleteDialog.value = true
}

const handleDeleteApp = async () => {
  try {
    const response = await api.deleteApp(appToDelete.value)
    if (response.data.success) {
      showSnackbar('App deleted successfully', 'success')
      deleteDialog.value = false
      appToDelete.value = ''
      loadDashboard()
    }
  } catch (error) {
    showSnackbar('Failed to delete app', 'error')
    deleteDialog.value = false
  }
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

const getProgressColor = (percent) => {
  const value = parseFloat(percent)
  if (value >= 90) return 'error'
  if (value >= 70) return 'warning'
  return 'primary'
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

const showSnackbar = (text, color = 'success') => {
  alert.value.message = text
  alert.value.type = color
  alert.value.show = true
}

onMounted(() => {
  loadDashboard()
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

.logout-btn {
  text-transform: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.action-header-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
}

.action-header-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toggle-metrics-btn {
  text-transform: none;
  font-weight: 500;
  border-color: rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.toggle-metrics-btn:hover {
  border-color: rgba(102, 126, 234, 0.5);
  background-color: rgba(102, 126, 234, 0.1);
}

.main-content {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
}

.metric-card {
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.metric-card:hover {
  transform: translateY(-4px);
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3), 0 0 20px rgba(102, 126, 234, 0.2);
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.cpu-icon {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
}

.memory-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.disk-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.success-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.error-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.warning-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.node-icon {
  background: linear-gradient(135deg, #68a063 0%, #539e4e 100%);
  box-shadow: 0 4px 12px rgba(104, 160, 99, 0.3);
}

.os-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.time-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.apps-table-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-field :deep(.v-field) {
  transition: all 0.3s ease;
}

.search-field :deep(.v-field:hover) {
  border-color: rgba(102, 126, 234, 0.5);
}

.modern-table :deep(thead) {
  background-color: rgba(51, 65, 85, 0.5);
}

.modern-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: #94a3b8 !important;
}

.modern-table :deep(tbody tr) {
  transition: all 0.2s ease;
}

.modern-table :deep(tbody tr:hover) {
  background-color: rgba(51, 65, 85, 0.3) !important;
}

.app-name-link {
  color: #3b82f6;
  text-decoration: none;
  transition: all 0.2s ease;
}

.app-name-link:hover {
  color: #60a5fa;
  text-decoration: underline;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.action-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.footer-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white;
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
</style>
