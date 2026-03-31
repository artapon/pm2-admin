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
      class="ma-0 rounded-0"
      style="width: 100%;"
    >
      {{ alert.message }}
    </v-alert>

    <v-container fluid class="pa-4">

      <!-- ═══ TOP STRIP: server info + toggle ═══ -->
      <div class="top-strip mb-3">
        <div class="top-strip-info" v-if="serverInfo">
          <div class="strip-item">
            <v-icon size="14" color="primary" class="strip-icon mr-1">mdi-nodejs</v-icon>
            <span class="strip-key">Node</span>
            <span class="strip-val">{{ nodeVersion }}</span>
          </div>
          <div class="strip-divider"></div>
          <div class="strip-item">
            <v-icon size="14" color="primary" class="strip-icon mr-1">mdi-desktop-tower</v-icon>
            <span class="strip-key">OS</span>
            <span class="strip-val">{{ serverInfo.osinfo }}</span>
          </div>
          <div class="strip-divider"></div>
          <div class="strip-item">
            <v-icon size="14" color="primary" class="strip-icon mr-1">mdi-clock-outline</v-icon>
            <span class="strip-key">Time</span>
            <span class="strip-val">{{ serverInfo.timeinfo }}</span>
          </div>
        </div>
        <div class="top-strip-info" v-else></div>
        <v-btn size="small" variant="outlined" @click="showMetrics = !showMetrics" class="toggle-btn">
          <v-icon class="mr-1" size="15">{{ showMetrics ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
          {{ showMetrics ? 'Hide' : 'Show' }} Metrics
        </v-btn>
      </div>

      <!-- ═══ MAIN METRICS ROW: 4 stats + CPU + Memory ═══ -->
      <v-row class="mb-3" dense v-if="showMetrics">

        <!-- Online -->
        <v-col cols="6" sm="4" md="2">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.04s">
            <v-card-text class="pa-3">
              <div class="stat-label">Online</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-success">{{ onlineCount }}</div>
                <div class="stat-icon green-icon">
                  <v-icon size="16" color="success">mdi-check-circle</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Stopped -->
        <v-col cols="6" sm="4" md="2">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.08s">
            <v-card-text class="pa-3">
              <div class="stat-label">Stopped</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-warning">{{ stoppedCount }}</div>
                <div class="stat-icon amber-icon">
                  <v-icon size="16" color="warning">mdi-stop-circle</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Errored -->
        <v-col cols="6" sm="4" md="2">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.12s">
            <v-card-text class="pa-3">
              <div class="stat-label">Errored</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-error">{{ erroredCount }}</div>
                <div class="stat-icon red-icon">
                  <v-icon size="16" color="error">mdi-alert-circle</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Total Apps -->
        <v-col cols="6" sm="4" md="2">
          <v-card class="stat-card fade-in" elevation="0" style="animation-delay:0.16s">
            <v-card-text class="pa-3">
              <div class="stat-label">Total Apps</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-primary">{{ apps.length }}</div>
                <div class="stat-icon blue-icon">
                  <v-icon size="16" color="primary">mdi-apps</v-icon>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- CPU -->
        <v-col cols="6" sm="4" md="2" v-if="serverInfo">
          <v-card class="stat-card resource-card fade-in" elevation="0" style="animation-delay:0.20s">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label">CPU</div>
                <div class="resource-icon cpu-icon">
                  <v-icon size="13" color="info">mdi-cpu-64-bit</v-icon>
                </div>
              </div>
              <div class="stat-value text-info mb-2">{{ serverInfo.currentCPU }}%</div>
              <v-progress-linear
                :model-value="serverInfo.currentCPU"
                :color="getProgressColor(serverInfo.currentCPU)"
                height="4"
                rounded
                bg-color="rgba(255,255,255,0.07)"
              ></v-progress-linear>
              <div class="resource-sub mt-1 text-truncate">{{ serverInfo.cpuInfo }}</div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Memory -->
        <v-col cols="6" sm="4" md="2" v-if="serverInfo">
          <v-card class="stat-card resource-card fade-in" elevation="0" style="animation-delay:0.24s">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label">Memory</div>
                <div class="resource-icon mem-icon">
                  <v-icon size="13" color="success">mdi-memory</v-icon>
                </div>
              </div>
              <div class="stat-value text-success mb-2">{{ serverInfo.memPercent }}%</div>
              <v-progress-linear
                :model-value="serverInfo.memPercent"
                :color="getProgressColor(serverInfo.memPercent)"
                height="4"
                rounded
                bg-color="rgba(255,255,255,0.07)"
              ></v-progress-linear>
              <div class="resource-sub mt-1 text-truncate">{{ serverInfo.memused }} / {{ serverInfo.memtotal }}</div>
            </v-card-text>
          </v-card>
        </v-col>

      </v-row>

      <!-- ═══ DISKS ROW ═══ -->
      <v-row v-if="serverInfo && showMetrics && (serverInfo.disks || []).length > 0" class="mb-3" dense>
        <v-col
          v-for="(disk, index) in (serverInfo.disks || [])"
          :key="'disk-'+index"
          cols="6" sm="4" md="2"
        >
          <v-card class="stat-card fade-in" elevation="0" :style="{ 'animation-delay': (0.28 + index * 0.04) + 's' }">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label text-truncate" style="max-width:80px">Disk {{ disk.mount }}</div>
                <div class="resource-icon disk-icon">
                  <v-icon size="13" color="warning">mdi-harddisk</v-icon>
                </div>
              </div>
              <div class="stat-value text-warning mb-2">{{ disk.percent }}%</div>
              <v-progress-linear
                :model-value="disk.percent"
                :color="getProgressColor(disk.percent)"
                height="4"
                rounded
                bg-color="rgba(255,255,255,0.07)"
              ></v-progress-linear>
              <div class="resource-sub mt-1 text-truncate">{{ disk.used }} / {{ disk.total }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══ APPLICATIONS TABLE ═══ -->
      <v-row>
        <v-col cols="12">
          <v-card class="table-card fade-in" elevation="0" style="animation-delay:0.32s">
            <v-card-title class="table-header pa-4 d-flex align-center">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2" size="18">mdi-view-list</v-icon>
                <span class="text-subtitle-2 font-weight-bold" style="color:#ffffff">Applications</span>
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
                style="max-width: 220px;"
              ></v-text-field>
            </v-card-title>
            <v-divider style="border-color: rgba(255,255,255,0.06);"></v-divider>
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
                  <v-icon start size="11">{{ getStatusIcon(item.status) }}</v-icon>
                  {{ item.status }}
                </v-chip>
              </template>
              <template v-slot:item.cpu="{ item }">
                <span :class="['font-weight-medium', parseFloat(item.cpu) > 70 ? 'text-warning' : 'text-white']">{{ item.cpu }}%</span>
              </template>
              <template v-slot:item.memory="{ item }">
                <span class="font-weight-medium text-white">{{ item.memory }}</span>
              </template>
              <template v-slot:item.restarts="{ item }">
                <span class="text-white">{{ item.restarts }}</span>
              </template>
              <template v-slot:item.uptime="{ item }">
                <span class="text-white">{{ item.uptime }}</span>
              </template>
              <template v-slot:item.actions="{ item }">
                <div v-if="authStore.role === 'root'" class="action-buttons">
                  <v-btn size="x-small" color="success" variant="tonal" icon @click="handleReloadApp(item.name)" title="Reload">
                    <v-icon size="15">mdi-reload</v-icon>
                  </v-btn>
                  <v-btn size="x-small" color="warning" variant="tonal" icon @click="confirmSimpleRestart(item.name)" title="Restart">
                    <v-icon size="15">mdi-restart</v-icon>
                  </v-btn>
                  <v-btn v-if="!item.name.includes('pm2') && item.status === 'online'" size="x-small" color="error" variant="tonal" icon @click="confirmStop(item.name)" title="Stop">
                    <v-icon size="15">mdi-stop</v-icon>
                  </v-btn>
                  <v-btn v-if="!item.name.includes('pm2') && (item.status === 'stopped' || item.status === 'errored')" size="x-small" color="error" variant="tonal" icon @click="confirmDelete(item.name)" title="Delete">
                    <v-icon size="15">mdi-delete</v-icon>
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
  <v-dialog v-model="deleteDialog" max-width="400">
    <v-card class="dialog-card">
      <v-card-title class="d-flex align-center pa-5 pb-3">
        <v-icon color="error" class="mr-2" size="20">mdi-delete-alert</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Confirm Delete</span>
      </v-card-title>
      <v-card-text class="px-5 pb-3">
        Delete <strong>{{ appToDelete }}</strong>? This will permanently remove the process.
      </v-card-text>
      <v-card-actions class="pa-5 pt-2">
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false" size="small">Cancel</v-btn>
        <v-btn color="error" variant="flat" @click="handleDeleteApp" size="small">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="restartDialog" max-width="360">
    <v-card class="dialog-card">
      <v-card-title class="d-flex align-center pa-5 pb-3">
        <v-icon color="warning" class="mr-2" size="20">mdi-restart</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Confirm Restart</span>
      </v-card-title>
      <v-card-text class="px-5 pb-3">
        Restart <strong>{{ appToRestart }}</strong>?
      </v-card-text>
      <v-card-actions class="pa-5 pt-2">
        <v-spacer />
        <v-btn variant="text" @click="restartDialog = false" size="small">Cancel</v-btn>
        <v-btn color="warning" variant="flat" @click="handleSimpleRestart" size="small">Restart</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="stopDialog" max-width="360">
    <v-card class="dialog-card">
      <v-card-title class="d-flex align-center pa-5 pb-3">
        <v-icon color="error" class="mr-2" size="20">mdi-stop-circle</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Confirm Stop</span>
      </v-card-title>
      <v-card-text class="px-5 pb-3">
        Stop <strong>{{ appToStop }}</strong>?
      </v-card-text>
      <v-card-actions class="pa-5 pt-2">
        <v-spacer />
        <v-btn variant="text" @click="stopDialog = false" size="small">Cancel</v-btn>
        <v-btn color="error" variant="flat" @click="handleStopApp" size="small">Stop</v-btn>
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
  background: #0d0d14;
  min-height: 100vh;
}

/* ── Fade-in animation ────────────────────────── */
.fade-in {
  animation: fadeInUp 0.35s ease-out forwards;
  opacity: 0;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Top strip ────────────────────────────────── */
.top-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.top-strip-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 0;
}
.strip-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
}
.strip-item:first-child { padding-left: 0; }
.strip-icon {
  background: rgb(var(--v-theme-primary)) !important;
  border-radius: 4px;
  padding: 2px;
}
.strip-key {
  font-size: 0.68rem;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  margin-right: 5px;
  white-space: nowrap;
}
.strip-val {
  font-size: 0.78rem;
  color: #ffffff;
  font-weight: 500;
  white-space: nowrap;
}
.strip-divider {
  width: 1px;
  height: 14px;
  background: rgba(255,255,255,0.08);
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .top-strip-info { display: none; }
}

/* ── Toggle button ────────────────────────────── */
.toggle-btn {
  text-transform: none;
  font-weight: 500;
  font-size: 0.8rem;
  border-color: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
  white-space: nowrap;
  flex-shrink: 0;
}
.toggle-btn:hover {
  border-color: rgba(99, 102, 241, 0.4) !important;
  background-color: rgba(99, 102, 241, 0.08) !important;
}

/* ── Shared card base ─────────────────────────── */
.stat-card {
  background: #13131f !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 10px !important;
  height: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  border-color: rgba(99,102,241,0.28) !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35) !important;
}

/* ── Stat card content ────────────────────────── */
.stat-label {
  font-size: 0.67rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ffffff;
  font-weight: 500;
}
.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}
.stat-icon {
  width: 30px; height: 30px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.green-icon  { background: rgba(34, 197, 94,  0.12); border: 1px solid rgba(34, 197, 94,  0.2); }
.amber-icon  { background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.2); }
.red-icon    { background: rgba(239, 68,  68,  0.12); border: 1px solid rgba(239, 68,  68,  0.2); }
.blue-icon   { background: rgba(99,  102, 241, 0.12); border: 1px solid rgba(99,  102, 241, 0.2); }

/* ── Resource cards (CPU / Memory / Disk) ─────── */
.resource-icon {
  width: 24px; height: 24px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cpu-icon  { background: rgba(6, 182, 212, 0.12);  border: 1px solid rgba(6, 182, 212, 0.2); }
.mem-icon  { background: rgba(34, 197, 94,  0.12);  border: 1px solid rgba(34, 197, 94,  0.2); }
.disk-icon { background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.2); }
.resource-sub {
  font-size: 0.65rem;
  color: #ffffff;
}

/* ── Applications table ───────────────────────── */
.table-card {
  background: #13131f !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 10px !important;
  overflow: hidden;
}
.table-header { background: transparent; }

.search-field :deep(.v-field) { transition: border-color 0.2s; }
.search-field :deep(.v-field:hover) { border-color: rgba(99,102,241,0.4); }
.search-field :deep(.v-field--focused) { border-color: rgba(99,102,241,0.7); }

.modern-table :deep(thead tr) { background: rgba(255,255,255,0.025); }
.modern-table :deep(th) {
  font-size: 0.68rem !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffffff !important;
}
.modern-table :deep(td) { color: #ffffff !important; }
.modern-table :deep(tbody tr:hover td) { background: rgba(99,102,241,0.05) !important; }
.modern-table :deep(tbody tr) { transition: background 0.15s; }

.app-name-link {
  color: #ffffff !important;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s;
}
.app-name-link:hover {
  color: #a5b4fc !important;
  text-decoration: underline;
}

.status-chip { font-size: 0.68rem !important; }

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

/* ── Dialogs ──────────────────────────────────── */
.dialog-card {
  background: #13131f !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 12px !important;
}
</style>
