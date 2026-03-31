<template>
  <MainAppBar @refresh="loadDashboard" />

  <v-main class="main-content">
    <!-- Alert Banner -->
    <v-alert
      v-if="alert.show"
      :type="alert.type"
      variant="tonal"
      closable
      @click:close="alert.show = false"
      class="ma-0 rounded-0 mt-3"
      style="width: 100%;"
    >
      {{ alert.message }}
    </v-alert>

    <v-container fluid class="pa-5">

      <!-- Toggle button -->
      <v-row class="mb-3" dense>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn size="small" variant="outlined" @click="showMetrics = !showMetrics" class="toggle-btn">
            <v-icon class="mr-1" size="16">{{ showMetrics ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
            {{ showMetrics ? 'Hide' : 'Show' }} Metrics
          </v-btn>
        </v-col>
      </v-row>

      <!-- ═══ ROW 1: Summary stat cards ═══ -->
      <v-row class="mb-4" dense v-if="showMetrics">
        <!-- Online -->
        <v-col cols="6" sm="3">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.05s">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="stat-label">Online</div>
                  <div class="stat-value text-success">{{ onlineCount }}</div>
                </div>
                <div class="stat-icon green-icon">
                  <v-icon size="22" color="white">mdi-check-circle</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Stopped -->
        <v-col cols="6" sm="3">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.1s">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="stat-label">Stopped</div>
                  <div class="stat-value text-warning">{{ stoppedCount }}</div>
                </div>
                <div class="stat-icon amber-icon">
                  <v-icon size="22" color="white">mdi-stop-circle</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Errored -->
        <v-col cols="6" sm="3">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.15s">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="stat-label">Errored</div>
                  <div class="stat-value text-error">{{ erroredCount }}</div>
                </div>
                <div class="stat-icon red-icon">
                  <v-icon size="22" color="white">mdi-alert-circle</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Total -->
        <v-col cols="6" sm="3">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.2s">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="stat-label">Total Apps</div>
                  <div class="stat-value text-primary">{{ apps.length }}</div>
                </div>
                <div class="stat-icon blue-icon">
                  <v-icon size="22" color="white">mdi-apps</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══ ROW 3: CPU + Memory ═══ -->
      <v-row v-if="serverInfo && showMetrics" class="mb-4" dense>
        <!-- CPU -->
        <v-col cols="12" sm="6">
          <v-card class="resource-card fade-in" elevation="0" style="animation-delay:0.3s">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-3">
                <div class="resource-icon cpu-icon mr-3">
                  <v-icon size="18" color="white">mdi-cpu-64-bit</v-icon>
                </div>
                <div>
                  <div class="resource-label">CPU Usage</div>
                  <div class="resource-value text-h4 font-weight-bold">{{ serverInfo.currentCPU }}%</div>
                </div>
              </div>
              <v-progress-linear
                :model-value="serverInfo.currentCPU"
                :color="getProgressColor(serverInfo.currentCPU)"
                height="5"
                rounded
                bg-color="rgba(255,255,255,0.08)"
              ></v-progress-linear>
              <div class="resource-sub mt-2">{{ serverInfo.cpuInfo }}</div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Memory -->
        <v-col cols="12" sm="6">
          <v-card class="resource-card fade-in" elevation="0" style="animation-delay:0.35s">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-3">
                <div class="resource-icon mem-icon mr-3">
                  <v-icon size="18" color="white">mdi-memory</v-icon>
                </div>
                <div>
                  <div class="resource-label">Memory Usage</div>
                  <div class="resource-value text-h4 font-weight-bold">{{ serverInfo.memPercent }}%</div>
                </div>
              </div>
              <v-progress-linear
                :model-value="serverInfo.memPercent"
                :color="getProgressColor(serverInfo.memPercent)"
                height="5"
                rounded
                bg-color="rgba(255,255,255,0.08)"
              ></v-progress-linear>
              <div class="resource-sub mt-2">{{ serverInfo.memused }} used / {{ serverInfo.memtotal }} total</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══ ROW 4: Disks ═══ -->
      <v-row v-if="serverInfo && showMetrics && (serverInfo.disks || []).length > 0" class="mb-4" dense>
        <v-col
          v-for="(disk, index) in (serverInfo.disks || [])"
          :key="'disk-'+index"
          cols="12" sm="6" md="3"
        >
          <v-card class="resource-card fade-in" elevation="0" :style="{ 'animation-delay': (0.4 + index * 0.05) + 's' }">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-3">
                <div class="resource-icon disk-icon mr-3">
                  <v-icon size="18" color="white">mdi-harddisk</v-icon>
                </div>
                <div>
                  <div class="resource-label">
                    Disk {{ disk.mount }}
                    <span v-if="disk.fs !== disk.mount" class="text-caption text-medium-emphasis">({{ disk.fs }})</span>
                  </div>
                  <div class="resource-value">{{ disk.percent }}%</div>
                </div>
              </div>
              <v-progress-linear
                :model-value="disk.percent"
                :color="getProgressColor(disk.percent)"
                height="5"
                rounded
                bg-color="rgba(255,255,255,0.08)"
              ></v-progress-linear>
              <div class="resource-sub mt-2">{{ disk.used }} used / {{ disk.total }} total</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══ ROW 5: Applications Table ═══ -->
      <v-row>
        <v-col cols="12">
          <!-- Server Info mini-card at top of table section -->
          <v-card v-if="serverInfo" class="info-bar fade-in mb-3" elevation="0" style="animation-delay:0.45s">
            <v-card-text class="pa-2 px-3">
              <div class="info-bar-inner">
                <div class="info-item">
                  <v-icon size="16" color="rgba(148,163,184,0.8)" class="mr-1">mdi-nodejs</v-icon>
                  <span class="info-key">Node</span>
                  <span class="info-val">{{ nodeVersion }}</span>
                </div>
                <div class="info-divider"></div>
                <div class="info-item">
                  <v-icon size="16" color="rgba(148,163,184,0.8)" class="mr-1">mdi-desktop-tower</v-icon>
                  <span class="info-key">OS</span>
                  <span class="info-val">{{ serverInfo.osinfo }}</span>
                </div>
                <div class="info-divider"></div>
                <div class="info-item">
                  <v-icon size="16" color="rgba(148,163,184,0.8)" class="mr-1">mdi-clock-outline</v-icon>
                  <span class="info-key">Time</span>
                  <span class="info-val">{{ serverInfo.timeinfo }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="table-card fade-in" elevation="0" style="animation-delay:0.5s">
            <v-card-title class="table-header pa-4 d-flex align-center">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2" size="20">mdi-view-list</v-icon>
                <span class="text-subtitle-1 font-weight-bold">Applications</span>
                <v-chip size="x-small" color="primary" variant="tonal" class="ml-2">{{ apps.length }}</v-chip>
              </div>
              <v-spacer />
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                placeholder="Search..."
                single-line
                hide-details
                variant="outlined"
                density="compact"
                class="search-field"
                style="max-width: 240px;"
              ></v-text-field>
            </v-card-title>
            <v-divider style="border-color: rgba(255,255,255,0.07);"></v-divider>
            <v-data-table
              :headers="headers"
              :items="apps"
              :search="search"
              :loading="loading"
              class="modern-table"
              hover
              density="comfortable"
            >
              <template v-slot:item.name="{ item }">
                <router-link :to="`/apps/${item.name}`" class="app-name-link font-weight-medium">
                  {{ item.name }}
                </router-link>
              </template>
              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  variant="tonal"
                  size="small"
                  class="font-weight-medium status-chip"
                >
                  <v-icon start size="12">{{ getStatusIcon(item.status) }}</v-icon>
                  {{ item.status }}
                </v-chip>
              </template>
              <template v-slot:item.cpu="{ item }">
                <span :class="['font-weight-medium', parseFloat(item.cpu) > 70 ? 'text-warning' : '']">{{ item.cpu }}%</span>
              </template>
              <template v-slot:item.memory="{ item }">
                <span class="font-weight-medium">{{ item.memory }}</span>
              </template>
              <template v-slot:item.actions="{ item }">
                <div v-if="authStore.role === 'root'" class="action-buttons">
                  <v-btn size="x-small" color="success" variant="tonal" icon @click="handleReloadApp(item.name)" title="Reload">
                    <v-icon size="16">mdi-reload</v-icon>
                  </v-btn>
                  <v-btn size="x-small" color="warning" variant="tonal" icon @click="confirmSimpleRestart(item.name)" title="Restart">
                    <v-icon size="16">mdi-restart</v-icon>
                  </v-btn>
                  <v-btn v-if="!item.name.includes('pm2') && item.status === 'online'" size="x-small" color="error" variant="tonal" icon @click="confirmStop(item.name)" title="Stop">
                    <v-icon size="16">mdi-stop</v-icon>
                  </v-btn>
                  <v-btn v-if="!item.name.includes('pm2') && (item.status === 'stopped' || item.status === 'errored')" size="x-small" color="error" variant="tonal" icon @click="confirmDelete(item.name)" title="Delete">
                    <v-icon size="16">mdi-delete</v-icon>
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>

    </v-container>
  </v-main>

  <!-- ═══ Confirmation Dialogs ═══ -->
  <v-dialog v-model="deleteDialog" max-width="420">
    <v-card class="dialog-card">
      <v-card-title class="d-flex align-center pa-5 pb-3">
        <v-icon color="error" class="mr-2">mdi-delete-alert</v-icon>
        Confirm Delete
      </v-card-title>
      <v-card-text class="px-5 pb-3">
        Are you sure you want to delete <strong>{{ appToDelete }}</strong>? This will permanently remove the process.
      </v-card-text>
      <v-card-actions class="pa-5 pt-2">
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
        <v-btn color="error" variant="flat" @click="handleDeleteApp">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="restartDialog" max-width="380">
    <v-card class="dialog-card">
      <v-card-title class="d-flex align-center pa-5 pb-3">
        <v-icon color="warning" class="mr-2">mdi-restart</v-icon>
        Confirm Restart
      </v-card-title>
      <v-card-text class="px-5 pb-3">
        Restart <strong>{{ appToRestart }}</strong>?
      </v-card-text>
      <v-card-actions class="pa-5 pt-2">
        <v-spacer />
        <v-btn variant="text" @click="restartDialog = false">Cancel</v-btn>
        <v-btn color="warning" variant="flat" @click="handleSimpleRestart">Restart</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="stopDialog" max-width="380">
    <v-card class="dialog-card">
      <v-card-title class="d-flex align-center pa-5 pb-3">
        <v-icon color="error" class="mr-2">mdi-stop-circle</v-icon>
        Confirm Stop
      </v-card-title>
      <v-card-text class="px-5 pb-3">
        Stop <strong>{{ appToStop }}</strong>?
      </v-card-text>
      <v-card-actions class="pa-5 pt-2">
        <v-spacer />
        <v-btn variant="text" @click="stopDialog = false">Cancel</v-btn>
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
const nodeVersion = ref('...')
const showMetrics = ref(true)

const deleteDialog = ref(false)
const appToDelete = ref('')
const restartDialog = ref(false)
const appToRestart = ref('')
const stopDialog = ref(false)
const appToStop = ref('')

const alert = ref({ show: false, type: 'success', message: '' })

const headers = computed(() => {
  const base = [
    { title: 'Name', key: 'name', minWidth: '160px' },
    { title: 'Status', key: 'status', width: '120px' },
    { title: 'CPU', key: 'cpu', width: '90px' },
    { title: 'Memory', key: 'memory', width: '110px' },
    { title: 'Restarts', key: 'restarts', width: '100px' },
    { title: 'Uptime', key: 'uptime' }
  ]
  if (authStore.role === 'root') {
    base.push({ title: '', key: 'actions', sortable: false, width: '130px', align: 'end' })
  }
  return base
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
    if (error.response?.status === 401) router.push('/login')
  } finally {
    loading.value = false
  }
}

const handleReloadApp = async (appName) => {
  try {
    const response = await api.reloadApp(appName)
    if (response.data.success) { showAlert('App reloaded successfully', 'success'); loadDashboard() }
  } catch { showAlert('Failed to reload app', 'error') }
}

const confirmSimpleRestart = (appName) => { appToRestart.value = appName; restartDialog.value = true }
const handleSimpleRestart = async () => {
  try {
    const response = await api.restartApp(appToRestart.value)
    if (response.data.success) {
      showAlert('App restarted successfully', 'success')
      restartDialog.value = false; appToRestart.value = ''; loadDashboard()
    }
  } catch { showAlert('Failed to restart', 'error'); restartDialog.value = false }
}

const confirmStop = (appName) => { appToStop.value = appName; stopDialog.value = true }
const handleStopApp = async () => {
  try {
    const response = await api.stopApp(appToStop.value)
    if (response.data.success) {
      showAlert('App stopped', 'success')
      stopDialog.value = false; appToStop.value = ''; loadDashboard()
    }
  } catch { showAlert('Failed to stop', 'error'); stopDialog.value = false }
}

const confirmDelete = (appName) => { appToDelete.value = appName; deleteDialog.value = true }
const handleDeleteApp = async () => {
  try {
    const response = await api.deleteApp(appToDelete.value)
    if (response.data.success) {
      showAlert('App deleted', 'success')
      deleteDialog.value = false; appToDelete.value = ''; loadDashboard()
    }
  } catch { showAlert('Failed to delete', 'error'); deleteDialog.value = false }
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
  const v = parseFloat(percent)
  if (v >= 90) return 'error'
  if (v >= 70) return 'warning'
  return 'primary'
}

const showAlert = (message, type = 'success') => {
  alert.value = { show: true, type, message }
  setTimeout(() => { alert.value.show = false }, 4000)
}

onMounted(() => { loadDashboard() })
</script>

<style scoped>
/* ── Base ─────────────────────────────────────── */
.main-content {
  background: #0d1117;
  min-height: 100vh;
}

/* ── Fade-in animation ────────────────────────── */
.fade-in {
  animation: fadeInUp 0.4s ease-out forwards;
  opacity: 0;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat cards (row 1) ───────────────────────── */
.stat-card {
  background: #161b22 !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 10px !important;
  transition: border-color 0.2s, transform 0.2s;
}
.stat-card:hover {
  border-color: rgba(99,102,241,0.35) !important;
  transform: translateY(-2px);
}
.stat-label {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ffffff;
  margin-bottom: 2px;
}
.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}
.stat-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.green-icon  { background: linear-gradient(135deg, #10b981, #059669); }
.amber-icon  { background: linear-gradient(135deg, #f59e0b, #d97706); }
.red-icon    { background: linear-gradient(135deg, #ef4444, #dc2626); }
.blue-icon   { background: linear-gradient(135deg, #6366f1, #4f46e5); }

/* ── Server info bar (row 2) ──────────────────── */
.info-bar {
  background: #161b22 !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 10px !important;
}
.info-bar-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 0;
}
.info-item {
  display: flex;
  align-items: center;
  padding: 0 16px;
  flex-wrap: wrap;
}
.info-item:first-child { padding-left: 4px; }
.info-key {
  font-size: 0.72rem;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 6px;
  white-space: nowrap;
}
.info-val {
  font-size: 0.82rem;
  color: #cbd5e1;
  font-weight: 500;
  word-break: break-word;
}
.info-divider {
  width: 1px;
  height: 18px;
  background: rgba(255,255,255,0.1);
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .info-bar-inner { flex-direction: column; align-items: flex-start; }
  .info-divider { display: none; }
  .info-item { padding: 4px 0; }
}

/* ── Resource cards (row 3) ───────────────────── */
.resource-card {
  background: #161b22 !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 10px !important;
  height: 100%;
  transition: border-color 0.2s, transform 0.2s;
}
.resource-card:hover {
  border-color: rgba(99,102,241,0.35) !important;
  transform: translateY(-2px);
}
.resource-icon {
  width: 36px; height: 36px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cpu-icon  { background: linear-gradient(135deg, #06b6d4, #0891b2); }
.mem-icon  { background: linear-gradient(135deg, #10b981, #059669); }
.disk-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
.resource-label {
  font-size: 0.72rem;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.resource-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
  color: #e2e8f0;
}
.resource-sub {
  font-size: 0.7rem;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Applications table ───────────────────────── */
.table-card {
  background: #161b22 !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 10px !important;
  overflow: hidden;
}
.table-header {
  background: transparent;
}
.search-field :deep(.v-field) { transition: border-color 0.2s; }
.search-field :deep(.v-field:hover)  { border-color: rgba(99,102,241,0.4); }
.search-field :deep(.v-field--focused) { border-color: rgba(99,102,241,0.7); }

.modern-table :deep(thead tr) { background: rgba(255,255,255,0.03); }
.modern-table :deep(th) {
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffffff !important;
}
.modern-table :deep(tbody tr:hover td) { background: rgba(99,102,241,0.05) !important; }
.modern-table :deep(tbody tr) { transition: background 0.15s; }

.app-name-link {
  color: #818cf8;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s;
}
.app-name-link:hover { color: #a5b4fc; text-decoration: underline; }

.status-chip { font-size: 0.7rem !important; }

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

/* ── Dialogs ──────────────────────────────────── */
.dialog-card {
  background: #1e2433 !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  border-radius: 12px !important;
}

.toggle-btn {
  text-transform: none;
  font-weight: 500;
  border-color: rgba(255, 255, 255, 0.2);
  color: #94a3b8;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  border-color: rgba(99, 102, 241, 0.5);
  background-color: rgba(99, 102, 241, 0.1);
  color: #e2e8f0;
}
</style>
