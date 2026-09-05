<template>
  <MainAppBar :title="env?.name || 'Environment'" icon="mdi-server-network" :titleIconSize="20" @refresh="loadAll" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Back + identity strip -->
      <div class="top-strip mb-3">
        <div class="d-flex align-center flex-wrap gap-2" style="min-width:0">
          <v-btn size="small" variant="text" prepend-icon="mdi-arrow-left" class="back-btn" to="/environments">
            Environments
          </v-btn>
          <v-chip :color="statusColor" variant="tonal" size="small">
            <v-icon start size="12">{{ statusIcon }}</v-icon>{{ statusText }}
          </v-chip>
          <span v-if="env" class="strip-val font-mono">{{ env.url }}</span>
        </div>
      </div>

      <!-- Unreachable -->
      <v-alert v-if="loadError" type="error" variant="tonal" density="compact" class="mb-4">
        <div class="font-weight-medium">Could not read this environment</div>
        <div class="text-caption mt-1">{{ loadError }}</div>
      </v-alert>

      <!-- Host strip -->
      <div v-if="info" class="host-strip mb-3">
        <div class="strip-item">
          <v-icon size="13" color="primary" class="strip-icon mr-1">mdi-desktop-tower</v-icon>
          <span class="strip-key">Host</span>
          <span class="strip-val">{{ info.host?.hostname }} — {{ info.host?.distro || info.host?.platform }} {{ info.host?.release }}</span>
        </div>
        <div class="strip-sep"></div>
        <div class="strip-item">
          <v-icon size="13" color="primary" class="strip-icon mr-1">mdi-ip-network-outline</v-icon>
          <span class="strip-key">IP</span>
          <span class="strip-val">{{ info.host?.ip || 'N/A' }}</span>
        </div>
        <div class="strip-sep"></div>
        <div class="strip-item">
          <v-icon size="13" color="primary" class="strip-icon mr-1">mdi-nodejs</v-icon>
          <span class="strip-key">Node</span>
          <span class="strip-val">{{ info.node?.node }}</span>
        </div>
        <div class="strip-sep"></div>
        <div class="strip-item">
          <v-icon size="13" color="primary" class="strip-icon mr-1">mdi-shield-server-outline</v-icon>
          <span class="strip-key">Agent</span>
          <span class="strip-val">{{ info.agent?.name }} v{{ info.agent?.version }}</span>
        </div>
      </div>

      <!-- Metric cards -->
      <v-row dense class="mb-3">
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0">
            <v-card-text class="pa-3">
              <div class="stat-label">Online</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-success">{{ counts.online }}</div>
                <div class="tint-box green-tint"><v-icon size="15" color="success">mdi-check-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.04s">
            <v-card-text class="pa-3">
              <div class="stat-label">Stopped</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-warning">{{ counts.stopped }}</div>
                <div class="tint-box amber-tint"><v-icon size="15" color="warning">mdi-stop-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.08s">
            <v-card-text class="pa-3">
              <div class="stat-label">Errored</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-error">{{ counts.errored }}</div>
                <div class="tint-box red-tint"><v-icon size="15" color="error">mdi-alert-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.12s">
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
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.16s">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label">CPU</div>
                <div class="tint-box cyan-tint"><v-icon size="13" color="info">mdi-cpu-64-bit</v-icon></div>
              </div>
              <div class="stat-value text-info mb-2">{{ serverInfo.currentCPU }}%</div>
              <v-progress-linear :model-value="Number(serverInfo.currentCPU)" :color="barColor(serverInfo.currentCPU)" height="3" rounded bg-color="rgba(255,255,255,0.07)" />
              <div class="res-sub mt-1">{{ serverInfo.cpuInfo }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2" v-if="serverInfo">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.2s">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="stat-label">Memory</div>
                <div class="tint-box green-tint"><v-icon size="13" color="success">mdi-memory</v-icon></div>
              </div>
              <div class="stat-value text-success mb-2">{{ serverInfo.memPercent }}%</div>
              <v-progress-linear :model-value="Number(serverInfo.memPercent)" :color="barColor(serverInfo.memPercent)" height="3" rounded bg-color="rgba(255,255,255,0.07)" />
              <div class="res-sub mt-1">{{ serverInfo.memused }} / {{ serverInfo.memtotal }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabs -->
      <v-card class="page-card fade-in" elevation="0" :loading="loading" style="animation-delay:.24s">
        <template v-slot:loader="{ isActive }">
          <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
        </template>

        <v-tabs v-model="tab" color="primary" density="compact" class="env-tabs">
          <v-tab value="apps"><v-icon size="15" class="mr-1">mdi-apps</v-icon>Apps</v-tab>
          <v-tab value="ports"><v-icon size="15" class="mr-1">mdi-lan</v-icon>Ports</v-tab>
          <v-tab value="system"><v-icon size="15" class="mr-1">mdi-harddisk</v-icon>System</v-tab>
        </v-tabs>
        <v-divider class="card-divider" />

        <v-window v-model="tab">
          <!-- Apps -->
          <v-window-item value="apps">
            <div class="card-header">
              <span class="card-title">
                <v-icon size="15" color="primary">mdi-apps</v-icon>
                PM2 Apps
                <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ apps.length }}</v-chip>
              </span>
              <v-spacer />
              <v-text-field
                v-model="appSearch" prepend-inner-icon="mdi-magnify" placeholder="Search..."
                single-line hide-details variant="outlined" density="compact"
                class="search-field" style="max-width:220px"
              />
            </div>
            <v-divider class="card-divider" />
            <v-data-table
              :headers="appHeaders" :items="apps" :search="appSearch"
              class="data-table" hover density="comfortable" :items-per-page="25"
            >
              <template v-slot:item.name="{ item }">
                <router-link
                  :to="{ name: 'EnvironmentAppDetail', params: { id: envId, appName: item.name } }"
                  class="app-link font-weight-semibold"
                >{{ item.name }}</router-link>
              </template>
              <template v-slot:item.status="{ item }">
                <v-chip :color="statusChipColor(item.status)" variant="tonal" size="small" class="status-chip">
                  <v-icon start size="11">{{ statusChipIcon(item.status) }}</v-icon>
                  {{ item.status }}
                </v-chip>
              </template>
              <template v-slot:item.cpu="{ item }">
                <span :class="parseFloat(item.cpu) > 70 ? 'text-warning font-weight-medium' : 'text-white'">{{ item.cpu }}%</span>
              </template>
              <template v-slot:item.actions="{ item }">
                <div v-if="isRoot" class="action-btns">
                  <v-btn size="small" color="success" variant="tonal" prepend-icon="mdi-reload" class="action-btn" @click="handleReload(item.name)">Reload</v-btn>
                  <v-btn size="small" color="warning" variant="tonal" prepend-icon="mdi-restart" class="action-btn" @click="openRestart(item.name)">Restart</v-btn>
                  <v-btn v-if="item.status==='online' && !item.name.includes('pm2')" size="small" color="error" variant="tonal" prepend-icon="mdi-stop" class="action-btn" @click="openStop(item.name)">Stop</v-btn>
                  <v-btn size="small" color="secondary" variant="tonal" prepend-icon="mdi-counter" class="action-btn" @click="openReset(item)">Reset</v-btn>
                  <v-btn v-if="(item.status==='stopped'||item.status==='errored') && !item.name.includes('pm2')" size="small" color="error" variant="tonal" prepend-icon="mdi-delete-outline" class="action-btn" @click="openDelete(item.name)">Delete</v-btn>
                </div>
              </template>
              <template v-slot:no-data>
                <div class="empty-state">
                  <v-icon size="36" color="grey">mdi-apps</v-icon>
                  <p class="mt-2 text-body-2 text-medium-emphasis">No PM2 apps on this server</p>
                </div>
              </template>
            </v-data-table>
          </v-window-item>

          <!-- Ports -->
          <v-window-item value="ports">
            <div class="card-header">
              <span class="card-title">
                <v-icon size="15" color="primary">mdi-lan</v-icon>
                Listening Ports
                <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ ports.length }}</v-chip>
              </span>
              <v-spacer />
              <v-btn size="small" variant="tonal" prepend-icon="mdi-refresh" class="action-btn mr-2" :loading="portsLoading" @click="loadPorts">
                Load
              </v-btn>
              <v-text-field
                v-model="portSearch" prepend-inner-icon="mdi-magnify" placeholder="Search..."
                single-line hide-details variant="outlined" density="compact"
                class="search-field" style="max-width:220px"
              />
            </div>
            <v-divider class="card-divider" />
            <v-data-table
              :headers="portHeaders" :items="ports" :search="portSearch" :loading="portsLoading"
              class="data-table" hover density="comfortable" :items-per-page="25"
            >
              <template v-slot:item.protocol="{ item }">
                <v-chip size="x-small" variant="tonal" color="info" class="font-weight-medium">{{ item.protocol }}</v-chip>
              </template>
              <template v-slot:item.localPort="{ item }">
                <span class="font-weight-medium font-mono" :class="{ 'text-secondary': !item.listening }">{{ item.localPort }}</span>
              </template>
              <template v-slot:item.listening="{ item }">
                <v-chip v-if="item.listening" size="x-small" variant="tonal" color="success">
                  <v-icon size="12" start>mdi-check-circle-outline</v-icon>Listening
                </v-chip>
                <v-chip v-else size="x-small" variant="tonal" color="grey">
                  <v-icon size="12" start>mdi-close-circle-outline</v-icon>Not listening
                </v-chip>
              </template>
              <template v-slot:item.appName="{ item }">
                <div v-if="item.isPM2Service" class="d-flex align-center gap-2">
                  <span class="font-weight-medium">{{ item.appName }}</span>
                  <v-chip :color="statusChipColor(item.status)" variant="tonal" size="x-small">{{ item.status }}</v-chip>
                </div>
                <span v-else class="text-secondary">{{ item.appName || '-' }}</span>
              </template>
              <template v-slot:no-data>
                <div class="empty-state">
                  <v-icon size="36" color="grey">mdi-lan-disconnect</v-icon>
                  <p class="mt-2 text-body-2 text-medium-emphasis">Press Load to read the port list from this server</p>
                </div>
              </template>
            </v-data-table>
          </v-window-item>

          <!-- System -->
          <v-window-item value="system">
            <div class="card-header">
              <span class="card-title">
                <v-icon size="15" color="primary">mdi-harddisk</v-icon>
                System
              </span>
            </div>
            <v-divider class="card-divider" />
            <v-card-text class="pa-4">
              <div v-if="!serverInfo" class="empty-state">
                <v-icon size="36" color="grey">mdi-help-circle-outline</v-icon>
                <p class="mt-2 text-body-2 text-medium-emphasis">No system data available</p>
              </div>
              <template v-else>
                <div class="info-grid mb-4">
                  <div class="info-row"><span class="info-key">Operating system</span><span class="info-val">{{ serverInfo.osinfo }}</span></div>
                  <div class="info-row"><span class="info-key">Processor</span><span class="info-val">{{ serverInfo.cpuInfo }}</span></div>
                  <div class="info-row"><span class="info-key">Memory</span><span class="info-val">{{ serverInfo.memused }} used / {{ serverInfo.memtotal }} total ({{ serverInfo.memfree }} free)</span></div>
                  <div class="info-row"><span class="info-key">Server time</span><span class="info-val">{{ serverInfo.timeinfo }}</span></div>
                  <div class="info-row"><span class="info-key">Agent</span><span class="info-val">{{ info?.agent?.name }} v{{ info?.agent?.version }} · up {{ formatUptime(info?.agent?.uptime) }}</span></div>
                </div>

                <div class="section-label mb-2">Disks</div>
                <v-table density="compact" class="data-table disk-table">
                  <thead>
                    <tr>
                      <th>Filesystem</th><th>Mount</th><th>Type</th>
                      <th class="text-right">Used</th><th class="text-right">Free</th><th class="text-right">Total</th><th style="width:180px">Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="disk in serverInfo.disks" :key="disk.fs + disk.mount">
                      <td class="font-mono">{{ disk.fs }}</td>
                      <td class="font-mono">{{ disk.mount }}</td>
                      <td>{{ disk.type }}</td>
                      <td class="text-right">{{ disk.used }}</td>
                      <td class="text-right">{{ disk.available }}</td>
                      <td class="text-right">{{ disk.total }}</td>
                      <td>
                        <div class="d-flex align-center gap-2">
                          <v-progress-linear :model-value="Number(disk.percent)" :color="barColor(disk.percent)" height="4" rounded style="min-width:70px" bg-color="rgba(255,255,255,0.07)" />
                          <span class="text-caption" style="min-width:44px">{{ disk.percent }}%</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </template>
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>

    </v-container>
  </v-main>

  <!-- Restart dialog -->
  <v-dialog v-model="restartDialog" max-width="360" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="warning" size="18">mdi-restart</v-icon> Confirm Restart</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Restart <strong>{{ appToRestart }}</strong> on {{ env?.name }}?</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="restartDialog=false">Cancel</v-btn>
        <v-btn color="warning" variant="flat" prepend-icon="mdi-restart" class="btn-confirm" :loading="busy" @click="handleRestart">Restart</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Stop dialog -->
  <v-dialog v-model="stopDialog" max-width="360" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-stop-circle-outline</v-icon> Confirm Stop</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Stop <strong>{{ appToStop }}</strong> on {{ env?.name }}?</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="stopDialog=false">Cancel</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-stop-circle-outline" class="btn-confirm" :loading="busy" @click="handleStop">Stop</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- PM2 reset dialog -->
  <v-dialog v-model="resetDialog" max-width="420" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="secondary" size="18">mdi-counter</v-icon> PM2 Reset</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">
        Reset PM2's counters for <strong>{{ appToReset }}</strong> &mdash; the restart count
        (currently <strong>{{ appToResetRestarts }}</strong>) and uptime go back to zero.
        The process is not restarted and keeps running.
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="resetDialog=false">Cancel</v-btn>
        <v-btn color="secondary" variant="flat" prepend-icon="mdi-counter" class="btn-confirm" :loading="busy" @click="handleReset">Reset</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete dialog -->
  <v-dialog v-model="deleteDialog" max-width="400" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-delete-outline</v-icon> Confirm Delete</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">
        Delete <strong>{{ appToDelete }}</strong> on {{ env?.name }}? This permanently removes the process from PM2 on that server.
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="deleteDialog=false">Cancel</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-delete-outline" class="btn-confirm" :loading="busy" @click="handleDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlert } from '../composables/useAlert'
import { useBusy } from '../composables/useBusy'
import api from '../services/api'
import { visibleApps, countByStatus } from '../utils/apps'
import MainAppBar from '../components/MainAppBar.vue'

const route = useRoute()
const authStore = useAuthStore()
const { showAlert } = useAlert()
const { busy, run } = useBusy()

const envId = computed(() => route.params.id)
const isRoot = computed(() => authStore.role === 'root')

const env = ref(null)
const info = ref(null)
const serverInfo = ref(null)
const allApps = ref([])
const ports = ref([])

// PM2's own modules are plumbing on the remote box, not apps somebody deployed there —
// the local dashboard hides them and an environment reads the same way.
const apps = computed(() => visibleApps(allApps.value))
// Derived from the visible list rather than the agent's counts, which tally every process
// PM2 knows about including the modules hidden above.
const counts = computed(() => countByStatus(apps.value))

const loading = ref(false)
const portsLoading = ref(false)
const loadError = ref('')
const tab = ref('apps')
const appSearch = ref('')
const portSearch = ref('')

const restartDialog = ref(false)
const appToRestart = ref('')
const stopDialog = ref(false)
const appToStop = ref('')
const resetDialog = ref(false)
const appToReset = ref('')
const appToResetRestarts = ref(0)
const deleteDialog = ref(false)
const appToDelete = ref('')

// Same columns as the local Applications table, so both read alike
const appHeaders = computed(() => {
  const base = [
    { title: 'Name', key: 'name', minWidth: '160px' },
    { title: 'Status', key: 'status', width: '120px' },
    { title: 'CPU', key: 'cpu', width: '90px' },
    { title: 'Memory', key: 'memory', width: '110px' },
    { title: 'Restarts', key: 'restarts', width: '100px' },
    { title: 'Uptime', key: 'uptime' }
  ]
  // Wide enough for the five action buttons to stay on one line
  if (isRoot.value) base.push({ title: '', key: 'actions', sortable: false, minWidth: '390px', align: 'end' })
  return base
})

const portHeaders = [
  { title: 'Protocol', key: 'protocol', width: '110px' },
  { title: 'Port', key: 'localPort', width: '100px' },
  { title: 'Bound', key: 'listening', width: '150px', sortable: false },
  { title: 'Service / Application', key: 'appName' }
]

const statusColor = computed(() => {
  if (!env.value) return 'grey'
  if (!env.value.enabled) return 'grey'
  return loadError.value ? 'error' : 'success'
})
const statusIcon = computed(() => {
  if (env.value && !env.value.enabled) return 'mdi-pause-circle-outline'
  return loadError.value ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'
})
const statusText = computed(() => {
  if (env.value && !env.value.enabled) return 'Disabled'
  return loadError.value ? 'Unreachable' : 'Online'
})

const loadAll = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const envRes = await api.getEnvironment(envId.value)
    if (envRes.data.success) env.value = envRes.data.data
  } catch (e) {
    showAlert(e.response?.data?.error || 'Environment not found', 'error')
    loading.value = false
    return
  }

  // The three reads are independent — issue them together so the page costs the slowest
  // one rather than their sum, and let each fail on its own.
  const [appsRes, sysRes, infoRes] = await Promise.allSettled([
    api.getEnvironmentApps(envId.value),
    api.getEnvironmentSystemInfo(envId.value),
    api.getEnvironmentInfo(envId.value)
  ])

  if (appsRes.status === 'fulfilled' && appsRes.value.data.success) {
    allApps.value = appsRes.value.data.data.apps || []
  } else {
    allApps.value = []
    loadError.value = appsRes.status === 'rejected'
      ? (appsRes.reason?.response?.data?.error || 'Failed to read apps from the agent')
      : 'Failed to read apps from the agent'
  }

  if (sysRes.status === 'fulfilled' && sysRes.value.data.success) {
    serverInfo.value = sysRes.value.data.data.serverinfo || null
  }

  // Agent and host identity. A failure here only costs the header strip, so it never
  // clears the app list above.
  if (infoRes.status === 'fulfilled' && infoRes.value.data.success) {
    info.value = infoRes.value.data.data
  }

  loading.value = false
}

const loadPorts = async () => {
  portsLoading.value = true
  try {
    const res = await api.getEnvironmentPorts(envId.value)
    if (res.data.success) ports.value = res.data.data.listPorts || []
  } catch (e) {
    showAlert(e.response?.data?.error || 'Failed to read ports', 'error')
  } finally {
    portsLoading.value = false
  }
}

/* -- App actions ----------------------------------------------------------- */

// Each action is one call to the agent through this server; the list is reloaded straight
// after so the row reflects what PM2 on that machine now reports.
const runAppAction = async (label, call) => {
  try {
    const res = await call()
    if (res.data.success) {
      showAlert(label, 'success')
      await loadAll()
      return true
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'The action failed', 'error')
  }
  return false
}

const handleReload = (name) =>
  runAppAction('App reloaded', () => api.reloadEnvironmentApp(envId.value, name))

const openRestart = (name) => { appToRestart.value = name; restartDialog.value = true }
const handleRestart = () => run(async () => {
  await runAppAction('App restarted', () => api.restartEnvironmentApp(envId.value, appToRestart.value))
  restartDialog.value = false
})

const openStop = (name) => { appToStop.value = name; stopDialog.value = true }
const handleStop = () => run(async () => {
  await runAppAction('App stopped', () => api.stopEnvironmentApp(envId.value, appToStop.value))
  stopDialog.value = false
})

const openReset = (item) => {
  appToReset.value = item.name
  appToResetRestarts.value = item.restarts || 0
  resetDialog.value = true
}
const handleReset = () => run(async () => {
  await runAppAction('PM2 counters reset', () => api.resetEnvironmentApp(envId.value, appToReset.value))
  resetDialog.value = false
})

const openDelete = (name) => { appToDelete.value = name; deleteDialog.value = true }
const handleDelete = () => run(async () => {
  await runAppAction('App deleted', () => api.deleteEnvironmentApp(envId.value, appToDelete.value))
  deleteDialog.value = false
})

// Ports are a second round trip to the agent — only fetch them when that tab is opened
watch(tab, (t) => { if (t === 'ports' && ports.value.length === 0 && !portsLoading.value) loadPorts() })

const statusChipColor = (s) => ({ online: 'success', stopped: 'warning', errored: 'error' }[s] || 'grey')
const statusChipIcon = (s) => ({ online: 'mdi-check-circle', stopped: 'mdi-stop-circle', errored: 'mdi-alert-circle' }[s] || 'mdi-help-circle')
const barColor = (v) => (Number(v) >= 85 ? 'error' : Number(v) >= 60 ? 'warning' : 'success')

const formatUptime = (seconds) => {
  if (!seconds && seconds !== 0) return 'N/A'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

onMounted(loadAll)
</script>

<style scoped>
.app-link { color:#fff!important; text-decoration:none; font-weight:600; transition:color .15s; }
.app-link:hover { color:#a5b4fc!important; }
/* Vuetify's gap utility is `ga-*`, so table row buttons get their spacing here. */
.action-btns { display:flex; gap:4px; justify-content:flex-end; flex-wrap:wrap; }

.top-strip { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.back-btn { text-transform:none; color:#94a3b8!important; }
.host-strip { display:flex; align-items:center; flex-wrap:wrap; gap:0; }
.strip-item { display:flex; align-items:center; padding:0 12px; }
.strip-item:first-child { padding-left:0; }
.strip-icon { background:rgb(var(--v-theme-primary)); border-radius:3px; padding:2px; }
.strip-key { font-size:.65rem; color:#fff; text-transform:uppercase; letter-spacing:.06em; font-weight:600; margin-right:5px; white-space:nowrap; }
.strip-val { font-size:.76rem; color:#fff; font-weight:500; }
.strip-sep { width:1px; height:12px; background:rgba(255,255,255,.08); flex-shrink:0; }

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

.env-tabs { min-height:42px; }
.section-label { font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; }
.info-grid { display:flex; flex-direction:column; gap:6px; }
.info-row { display:flex; gap:12px; flex-wrap:wrap; }
.info-key { min-width:150px; font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:#64748b; font-weight:600; }
.info-val { font-size:.82rem; color:#e2e8f0; }
.disk-table { background:transparent!important; }

.empty-state { display:flex; flex-direction:column; align-items:center; padding:32px; }
.font-mono { font-family:'Courier New', monospace; }
.text-secondary { color:#94a3b8; }
.status-chip { font-size:.67rem!important; }
</style>
