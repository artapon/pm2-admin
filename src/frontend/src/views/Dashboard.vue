<template>
  <MainAppBar @refresh="loadDashboard" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Top info strip -->
      <div class="top-strip mb-3">
        <div class="strip-info" v-if="serverInfo">
          <div class="strip-item">
            <v-icon size="13" color="primary" class="strip-icon mr-1">mdi-nodejs</v-icon>
            <span class="strip-key">Node</span>
            <span class="strip-val">{{ nodeVersion }}</span>
          </div>
          <div class="strip-sep"></div>
          <div class="strip-item">
            <v-icon size="13" color="primary" class="strip-icon mr-1">mdi-desktop-tower</v-icon>
            <span class="strip-key">OS</span>
            <span class="strip-val">{{ serverInfo.osinfo }}</span>
          </div>
          <div class="strip-sep"></div>
          <div class="strip-item">
            <v-icon size="13" color="primary" class="strip-icon mr-1">mdi-clock-outline</v-icon>
            <span class="strip-key">Time</span>
            <span class="strip-val">{{ serverInfo.timeinfo }}</span>
          </div>
        </div>
        <div v-else class="strip-info"></div>
        <v-btn size="small" variant="outlined" class="toggle-btn" @click="showMetrics = !showMetrics">
          <v-icon size="14" class="mr-1">{{ showMetrics ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
          {{ showMetrics ? 'Hide' : 'Show' }} Metrics
        </v-btn>
      </div>

      <!-- Metric cards -->
      <v-row dense class="mb-3" v-if="showMetrics">
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.04s">
            <v-card-text class="pa-3">
              <div class="stat-label">Online</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-success">{{ onlineCount }}</div>
                <div class="tint-box green-tint"><v-icon size="15" color="success">mdi-check-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.08s">
            <v-card-text class="pa-3">
              <div class="stat-label">Stopped</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-warning">{{ stoppedCount }}</div>
                <div class="tint-box amber-tint"><v-icon size="15" color="warning">mdi-stop-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.12s">
            <v-card-text class="pa-3">
              <div class="stat-label">Errored</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-error">{{ erroredCount }}</div>
                <div class="tint-box red-tint"><v-icon size="15" color="error">mdi-alert-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.16s">
            <v-card-text class="pa-3">
              <div class="stat-label">Total Apps</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-primary">{{ apps.length }}</div>
                <div class="tint-box blue-tint"><v-icon size="15" color="primary">mdi-apps</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2" v-if="serverInfo">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.20s">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label">CPU</div>
                <div class="tint-box cyan-tint"><v-icon size="13" color="info">mdi-cpu-64-bit</v-icon></div>
              </div>
              <div class="stat-value text-info mb-2">{{ serverInfo.currentCPU }}%</div>
              <v-progress-linear :model-value="serverInfo.currentCPU" :color="barColor(serverInfo.currentCPU)" height="3" rounded bg-color="rgba(255,255,255,0.07)" />
              <div class="res-sub mt-1">{{ serverInfo.cpuInfo }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2" v-if="serverInfo">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.24s">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label">Memory</div>
                <div class="tint-box green-tint"><v-icon size="13" color="success">mdi-memory</v-icon></div>
              </div>
              <div class="stat-value text-success mb-2">{{ serverInfo.memPercent }}%</div>
              <v-progress-linear :model-value="serverInfo.memPercent" :color="barColor(serverInfo.memPercent)" height="3" rounded bg-color="rgba(255,255,255,0.07)" />
              <div class="res-sub mt-1">{{ serverInfo.memused }} / {{ serverInfo.memtotal }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Disk cards -->
      <v-row dense class="mb-3" v-if="serverInfo && showMetrics && serverInfo.disks?.length">
        <v-col v-for="(disk, i) in serverInfo.disks" :key="disk.mount" cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" :style="{ animationDelay: (0.28 + i * 0.04) + 's' }">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label text-truncate">Disk {{ disk.mount }}</div>
                <div class="tint-box amber-tint"><v-icon size="13" color="warning">mdi-harddisk</v-icon></div>
              </div>
              <div class="stat-value text-warning mb-2">{{ disk.percent }}%</div>
              <v-progress-linear :model-value="disk.percent" :color="barColor(disk.percent)" height="3" rounded bg-color="rgba(255,255,255,0.07)" />
              <div class="res-sub mt-1">{{ disk.used }} / {{ disk.total }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Apps table -->
      <v-card class="page-card fade-in" elevation="0" style="animation-delay:.32s">
        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="primary">mdi-view-list-outline</v-icon>
            Applications
            <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ apps.length }}</v-chip>

          </span>
          <v-spacer />
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search..."
            single-line hide-details variant="outlined" density="compact"
            class="search-field" style="max-width:220px"
          />
        </div>
        <v-divider class="card-divider" />
        <v-data-table
          :headers="headers" :items="apps" :search="search" :loading="loading"
          class="data-table" hover density="comfortable"
        >
          <template v-slot:item.name="{ item }">
            <router-link :to="`/apps/${item.name}`" class="app-link font-weight-semibold">{{ item.name }}</router-link>
          </template>
          <template v-slot:item.status="{ item }">
            <v-chip :color="statusColor(item.status)" variant="tonal" size="small" class="status-chip">
              <v-icon start size="11">{{ statusIcon(item.status) }}</v-icon>
              {{ item.status }}
            </v-chip>
          </template>
          <template v-slot:item.cpu="{ item }">
            <span :class="parseFloat(item.cpu) > 70 ? 'text-warning font-weight-medium' : 'text-white'">{{ item.cpu }}%</span>
          </template>
          <template v-slot:item.memory="{ item }"><span>{{ item.memory }}</span></template>
          <template v-slot:item.restarts="{ item }"><span>{{ item.restarts }}</span></template>
          <template v-slot:item.uptime="{ item }"><span>{{ item.uptime }}</span></template>
          <template v-slot:item.actions="{ item }">
            <div v-if="authStore.role === 'root'" class="action-btns">
              <v-btn size="small" color="success" variant="tonal" prepend-icon="mdi-reload" class="action-btn" @click="handleReload(item.name)">Reload</v-btn>
              <v-btn size="small" color="warning" variant="tonal" prepend-icon="mdi-restart" class="action-btn" @click="openRestart(item.name)">Restart</v-btn>
              <v-btn v-if="item.status==='online' && !item.name.includes('pm2')" size="small" color="error" variant="tonal" prepend-icon="mdi-stop" class="action-btn" @click="openStop(item.name)">Stop</v-btn>
              <v-btn v-if="(item.status==='stopped'||item.status==='errored') && !item.name.includes('pm2')" size="small" color="error" variant="tonal" prepend-icon="mdi-delete-outline" class="action-btn" @click="openDelete(item.name)">Delete</v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>

    </v-container>
  </v-main>

  <!-- Delete dialog -->
  <v-dialog v-model="deleteDialog" max-width="380">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-delete-outline</v-icon> Confirm Delete</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Delete <strong>{{ appToDelete }}</strong>? This permanently removes the process.</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="deleteDialog=false">Cancel</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-delete-outline" class="btn-confirm" @click="handleDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Restart dialog -->
  <v-dialog v-model="restartDialog" max-width="360">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="warning" size="18">mdi-restart</v-icon> Confirm Restart</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Restart <strong>{{ appToRestart }}</strong>?</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="restartDialog=false">Cancel</v-btn>
        <v-btn color="warning" variant="flat" prepend-icon="mdi-restart" class="btn-confirm" @click="handleRestart">Restart</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Stop dialog -->
  <v-dialog v-model="stopDialog" max-width="360">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-stop-circle-outline</v-icon> Confirm Stop</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Stop <strong>{{ appToStop }}</strong>?</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="stopDialog=false">Cancel</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-stop-circle-outline" class="btn-confirm" @click="handleStop">Stop</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const router = useRouter()
const authStore = useAuthStore()
const { showAlert } = useAlert()

const allApps = shallowRef([])
const serverInfo = ref(null)
const loading = ref(false)
const search = ref('')
const nodeVersion = ref('...')
const showMetrics = ref(true)

const apps = computed(() => allApps.value.filter(a => !a.name.startsWith('pm2-')))
const onlineCount  = computed(() => apps.value.filter(a => a.status === 'online').length)
const stoppedCount = computed(() => apps.value.filter(a => a.status === 'stopped').length)
const erroredCount = computed(() => apps.value.filter(a => a.status === 'errored').length)

const deleteDialog = ref(false)
const appToDelete = ref('')
const restartDialog = ref(false)
const appToRestart = ref('')
const stopDialog = ref(false)
const appToStop = ref('')

const headers = computed(() => {
  const base = [
    { title: 'Name', key: 'name', minWidth: '160px' },
    { title: 'Status', key: 'status', width: '120px' },
    { title: 'CPU', key: 'cpu', width: '90px' },
    { title: 'Memory', key: 'memory', width: '110px' },
    { title: 'Restarts', key: 'restarts', width: '100px' },
    { title: 'Uptime', key: 'uptime' }
  ]
  if (authStore.role === 'root') base.push({ title: '', key: 'actions', sortable: false, minWidth: '300px', align: 'end' })
  return base
})

const loadDashboard = async () => {
  loading.value = true
  try {
    const res = await api.getDashboard()
    if (res.data.success) {
      const d = res.data.data
      allApps.value = d.apps || []
      serverInfo.value = d.serverinfo
      nodeVersion.value = d.node?.node || 'N/A'
    }
  } catch (e) {
    if (e.response?.status === 401) router.push('/login')
  } finally {
    loading.value = false
  }
}

const handleReload = async (name) => {
  try {
    const res = await api.reloadApp(name)
    if (res.data.success) { showAlert('App reloaded', 'success'); loadDashboard() }
  } catch { showAlert('Failed to reload', 'error') }
}

const openRestart = (name) => { appToRestart.value = name; restartDialog.value = true }
const handleRestart = async () => {
  try {
    const res = await api.restartApp(appToRestart.value)
    if (res.data.success) { showAlert('App restarted', 'success'); restartDialog.value = false; loadDashboard() }
  } catch { showAlert('Failed to restart', 'error'); restartDialog.value = false }
}

const openStop = (name) => { appToStop.value = name; stopDialog.value = true }
const handleStop = async () => {
  try {
    const res = await api.stopApp(appToStop.value)
    if (res.data.success) { showAlert('App stopped', 'success'); stopDialog.value = false; loadDashboard() }
  } catch { showAlert('Failed to stop', 'error'); stopDialog.value = false }
}

const openDelete = (name) => { appToDelete.value = name; deleteDialog.value = true }
const handleDelete = async () => {
  try {
    const res = await api.deleteApp(appToDelete.value)
    if (res.data.success) { showAlert('App deleted', 'success'); deleteDialog.value = false; loadDashboard() }
  } catch { showAlert('Failed to delete', 'error'); deleteDialog.value = false }
}

const statusColor = (s) => ({ online: 'success', stopped: 'warning', errored: 'error' }[s] || 'grey')
const statusIcon  = (s) => ({ online: 'mdi-check-circle', stopped: 'mdi-stop-circle', errored: 'mdi-alert-circle' }[s] || 'mdi-help-circle')
const barColor    = (v) => parseFloat(v) >= 90 ? 'error' : parseFloat(v) >= 70 ? 'warning' : 'primary'

onMounted(loadDashboard)
</script>

<style scoped>
/* Top strip */
.top-strip { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.strip-info { display:flex; align-items:center; flex-wrap:wrap; gap:0; }
.strip-item { display:flex; align-items:center; padding:0 12px; }
.strip-item:first-child { padding-left:0; }
.strip-icon { background:rgb(var(--v-theme-primary)); border-radius:3px; padding:2px; }
.strip-key { font-size:.65rem; color:#fff; text-transform:uppercase; letter-spacing:.06em; font-weight:600; margin-right:5px; white-space:nowrap; }
.strip-val { font-size:.76rem; color:#fff; font-weight:500; white-space:nowrap; }
.strip-sep { width:1px; height:12px; background:rgba(255,255,255,.08); flex-shrink:0; }
.toggle-btn { text-transform:none; font-weight:500; font-size:.78rem; border-color:rgba(255,255,255,.1)!important; color:#fff!important; }
.toggle-btn:hover { border-color:rgba(99,102,241,.4)!important; background:rgba(99,102,241,.08)!important; }
@media(max-width:600px){ .strip-info{display:none} }

/* Stat cards */
.stat-card { height:100%; }
.stat-label { font-size:.63rem; letter-spacing:.07em; text-transform:uppercase; color:#fff; font-weight:600; }
.stat-row { display:flex; align-items:center; justify-content:space-between; }
.stat-value { font-size:1.65rem; font-weight:700; line-height:1; letter-spacing:-.02em; }
.tint-box { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.green-tint { background:rgba(34,197,94,.12);  border:1px solid rgba(34,197,94,.2); }
.amber-tint { background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.2); }
.red-tint   { background:rgba(239,68,68,.12);  border:1px solid rgba(239,68,68,.2); }
.blue-tint  { background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.2); }
.cyan-tint  { background:rgba(6,182,212,.12);  border:1px solid rgba(6,182,212,.2); }
.res-sub { font-size:.62rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Table */
.app-link { color:#fff!important; text-decoration:none; font-weight:600; transition:color .15s; }
.app-link:hover { color:#a5b4fc!important; }
.status-chip { font-size:.67rem!important; }
.action-btns { display:flex; gap:4px; justify-content:flex-end; flex-wrap:wrap; }
</style>
