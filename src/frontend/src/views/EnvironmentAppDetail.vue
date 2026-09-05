<template>
  <MainAppBar :title="appName" icon="mdi-application-outline" :titleIconSize="20" showBack @refresh="loadAppData" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Which server this app lives on -->
      <div class="top-strip mb-3">
        <div class="d-flex align-center flex-wrap ga-2" style="min-width:0">
          <v-btn size="small" variant="text" prepend-icon="mdi-arrow-left" class="back-btn" :to="`/environments/${envId}`">
            {{ env?.name || 'Environment' }}
          </v-btn>
          <span v-if="env" class="strip-val font-mono">{{ env.url }}</span>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading && !app" class="d-flex flex-column align-center justify-center" style="min-height:360px">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
        <span class="text-body-2 text-medium-emphasis">Loading application data...</span>
      </div>

      <v-alert v-if="loadError" type="error" variant="tonal" density="compact" class="mb-4">
        <div class="font-weight-medium">Could not read this app from the agent</div>
        <div class="text-caption mt-1">{{ loadError }}</div>
      </v-alert>

      <template v-if="app">
        <!-- Status card -->
        <v-card class="page-card fade-in mb-4" elevation="0" :loading="loading">
          <template v-slot:loader="{ isActive }">
            <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
          </template>

          <div class="app-header">
            <div class="app-header-left">
              <div class="app-icon-wrap">
                <v-icon size="20" color="primary">mdi-application-outline</v-icon>
              </div>
              <div>
                <div class="app-name">{{ app.name }}</div>
                <div class="app-env" v-if="app.env">{{ app.env }}</div>
              </div>
            </div>
            <div class="app-header-right">
              <v-chip :color="statusColor(app.status)" variant="flat" size="small" class="font-weight-bold mr-2">
                <v-icon start size="12">{{ statusIcon(app.status) }}</v-icon>
                {{ app.status }}
              </v-chip>
              <v-btn size="x-small" variant="outlined" class="toggle-btn" @click="showDetails=!showDetails">
                <v-icon size="13" class="mr-1">{{ showDetails ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                {{ showDetails ? 'Hide' : 'Show' }} Details
              </v-btn>
            </div>
          </div>

          <!-- Metrics -->
          <template v-if="showDetails">
            <v-divider class="card-divider" />
            <v-card-text class="pa-4">
              <v-row dense class="mb-3">
                <v-col cols="6" sm="3">
                  <div class="metric-row">
                    <div class="metric-icon cyan-tint"><v-icon size="16" color="info">mdi-cpu-64-bit</v-icon></div>
                    <div class="ml-2">
                      <div class="metric-label">CPU</div>
                      <div class="metric-val">{{ app.cpu }}%</div>
                    </div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="metric-row">
                    <div class="metric-icon green-tint"><v-icon size="16" color="success">mdi-memory</v-icon></div>
                    <div class="ml-2">
                      <div class="metric-label">Memory</div>
                      <div class="metric-val">{{ formatBytes(app.memory) }}</div>
                    </div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="metric-row">
                    <div class="metric-icon amber-tint"><v-icon size="16" color="warning">mdi-restart</v-icon></div>
                    <div class="ml-2">
                      <div class="metric-label">Restarts</div>
                      <div class="metric-val">{{ app.restarts || 0 }}</div>
                    </div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="metric-row">
                    <div class="metric-icon blue-tint"><v-icon size="16" color="primary">mdi-clock-outline</v-icon></div>
                    <div class="ml-2">
                      <div class="metric-label">Uptime</div>
                      <div class="metric-val text-sm">{{ app.uptime }}</div>
                    </div>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="card-divider mb-3" />

              <!-- Info grid -->
              <v-row dense>
                <v-col cols="12" md="6" v-if="app.node_version">
                  <div class="info-row"><v-icon size="15" color="success" class="mr-2">mdi-nodejs</v-icon><span class="info-key">Node:</span><span class="info-val">{{ app.node_version }}</span></div>
                </v-col>
                <v-col cols="12" md="6" v-if="nodeArgsText">
                  <div class="info-row"><v-icon size="15" color="info" class="mr-2">mdi-flag-outline</v-icon><span class="info-key">Node Arguments:</span><span class="info-val">{{ nodeArgsText }}</span></div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="info-row"><v-icon size="15" color="primary" class="mr-2">mdi-identifier</v-icon><span class="info-key">PM2 id:</span><span class="info-val">{{ app.pm_id }}</span></div>
                </v-col>
                <v-col cols="12" md="6" v-if="env">
                  <div class="info-row"><v-icon size="15" color="primary" class="mr-2">mdi-server-network</v-icon><span class="info-key">Server:</span><span class="info-val">{{ env.name }}</span></div>
                </v-col>
                <v-col cols="12" v-if="app.project_path">
                  <div class="info-row"><v-icon size="15" color="warning" class="mr-2">mdi-folder-outline</v-icon><span class="info-key">Path:</span><span class="info-val text-truncate">{{ app.project_path }}</span></div>
                </v-col>
                <v-col cols="12" v-if="app.exec_path">
                  <div class="info-row"><v-icon size="15" color="info" class="mr-2">mdi-console</v-icon><span class="info-key">Exec:</span><span class="info-val text-truncate">{{ app.exec_path }}</span></div>
                </v-col>
                <v-col cols="12" v-if="app.pm_out_log_path">
                  <div class="info-row"><v-icon size="15" color="info" class="mr-2">mdi-text-box-outline</v-icon><span class="info-key">Output log:</span><span class="info-val text-truncate">{{ app.pm_out_log_path }}</span></div>
                </v-col>
                <v-col cols="12" v-if="app.pm_err_log_path">
                  <div class="info-row"><v-icon size="15" color="error" class="mr-2">mdi-alert-circle-outline</v-icon><span class="info-key">Error log:</span><span class="info-val text-truncate">{{ app.pm_err_log_path }}</span></div>
                </v-col>
              </v-row>
            </v-card-text>
          </template>

          <!-- Actions -->
          <template v-if="isRoot">
            <v-divider class="card-divider" />
            <v-card-actions class="pa-4 flex-wrap ga-2">
              <v-btn v-if="!app.name.includes('pm2')" size="small" color="secondary" variant="tonal" class="action-btn" @click="flushDialog=true">
                <v-icon size="15" class="mr-1">mdi-delete-sweep-outline</v-icon>Flush Logs
              </v-btn>
              <v-btn v-if="app.status==='online'" size="small" color="success" variant="tonal" class="action-btn" :loading="acting==='reload'" @click="reloadApp">
                <v-icon size="15" class="mr-1">mdi-reload</v-icon>Reload
              </v-btn>
              <v-btn size="small" color="warning" variant="tonal" class="action-btn" @click="restartDialog=true">
                <v-icon size="15" class="mr-1">mdi-restart</v-icon>Restart
              </v-btn>
              <v-btn v-if="app.status==='online' && !app.name.includes('pm2')" size="small" color="error" variant="tonal" class="action-btn" @click="stopDialog=true">
                <v-icon size="15" class="mr-1">mdi-stop</v-icon>Stop
              </v-btn>
              <v-btn size="small" color="secondary" variant="tonal" class="action-btn" @click="resetDialog=true">
                <v-icon size="15" class="mr-1">mdi-counter</v-icon>PM2 Reset
              </v-btn>
              <v-btn size="small" color="info" variant="tonal" class="action-btn" @click="openDescribe">
                <v-icon size="15" class="mr-1">mdi-information-outline</v-icon>PM2 Describe
              </v-btn>
              <v-btn v-if="!app.name.includes('pm2') && (app.status==='stopped'||app.status==='errored')" size="small" color="error" variant="tonal" class="action-btn" @click="deleteDialog=true">
                <v-icon size="15" class="mr-1">mdi-delete-outline</v-icon>Delete
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>

        <v-row>
          <!-- .env panel -->
          <v-col v-if="isRoot" cols="12" md="4">
            <v-card class="page-card fade-in h-100" elevation="0" style="animation-delay:.08s" :loading="envLoading">
              <template v-slot:loader="{ isActive }">
                <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
              </template>
              <div class="d-flex align-center">
                <v-tabs v-model="envTab" bg-color="transparent" color="primary" density="compact" class="flex-grow-1">
                  <v-tab value="current" class="tab-label">Current .env</v-tab>
                  <v-tab value="backup" v-if="envBackup" class="tab-label">Backup .env</v-tab>
                  <v-tab value="edit" class="tab-label">Update .env</v-tab>
                </v-tabs>
                <v-btn
                  v-if="envTab !== 'edit'"
                  :icon="showEnv ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  size="small"
                  variant="text"
                  class="mr-2"
                  :title="showEnv ? 'Hide values' : 'Show values'"
                  @click="showEnv = !showEnv"
                />
              </div>
              <v-divider class="card-divider" />
              <div v-if="envPath" class="env-path" :title="envPath">{{ envPath }}</div>
              <v-card-text class="pa-3">
                <v-alert v-if="envError" type="error" variant="tonal" density="compact" class="mb-3 text-caption">
                  {{ envError }}
                </v-alert>
                <v-window v-model="envTab">
                  <v-window-item value="current">
                    <v-textarea :model-value="showEnv ? envContent : maskedEnv(envContent)" variant="outlined" rows="22" readonly class="env-ta" hide-details />
                  </v-window-item>
                  <v-window-item value="backup" v-if="envBackup">
                    <v-textarea :model-value="showEnv ? envBackup : maskedEnv(envBackup)" variant="outlined" rows="22" readonly class="env-ta" hide-details />
                  </v-window-item>
                  <v-window-item value="edit">
                    <v-alert type="warning" variant="tonal" density="compact" class="mb-3 text-caption">
                      Restart the application after updating .env
                    </v-alert>
                    <v-textarea v-model="envEdit" variant="outlined" rows="19" class="env-ta mb-3" hide-details />
                    <v-btn color="primary" variant="flat" block size="small" :loading="envSaving" :disabled="!envEdit || envEdit === envContent" @click="updateEnv">
                      <v-icon size="15" class="mr-1">mdi-content-save-outline</v-icon>Save .env
                    </v-btn>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Logs -->
          <v-col cols="12" :md="isRoot ? 8 : 12">
            <v-card class="page-card fade-in" elevation="0" style="animation-delay:.12s" :loading="logsLoading">
              <template v-slot:loader="{ isActive }">
                <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
              </template>
              <div class="card-header">
                <span class="card-title">
                  <v-icon size="15" color="primary">mdi-text-box-outline</v-icon>
                  Application Logs
                </span>
                <v-spacer />
                <v-btn-toggle v-model="logType" mandatory color="primary" density="compact" class="mr-2">
                  <v-btn value="stdout" class="action-btn"><v-icon size="13" class="mr-1">mdi-console</v-icon>Output</v-btn>
                  <v-btn value="stderr" class="action-btn"><v-icon size="13" class="mr-1">mdi-alert-circle-outline</v-icon>Error</v-btn>
                </v-btn-toggle>
                <div class="realtime-toggle mr-2" :class="{ 'realtime-toggle--on': realtime }">
                  <span v-if="realtime" class="live-dot" />
                  <v-switch
                    v-model="realtime"
                    color="success"
                    density="compact"
                    hide-details
                    inset
                    :label="realtime ? `Live · ${REALTIME_INTERVAL_MS / 1000}s` : 'Realtime'"
                    class="realtime-switch"
                  />
                </div>
                <v-btn color="secondary" variant="tonal" prepend-icon="mdi-refresh" class="action-btn" :loading="logsLoading" @click="loadLogs">Reload</v-btn>
              </div>
              <v-divider class="card-divider" />
              <v-card-text class="pa-0">
                <div ref="logBox" class="log-box" @scroll="onLogScroll">
                  <div v-for="(line, i) in logLines" :key="i" :class="['log-line', `log-${line.level}`]">
                    <span class="log-num">{{ i + 1 }}</span>
                    <span class="log-text">{{ line.text }}</span>
                  </div>
                </div>
                <div v-if="realtime && !stickToBottom" class="resume-bar" @click="scrollToBottom(true)">
                  <v-icon size="14" class="mr-1">mdi-arrow-down</v-icon>
                  Paused scrolling — jump to the newest lines
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>
  </v-main>

  <!-- Restart dialog -->
  <v-dialog v-model="restartDialog" max-width="380" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="warning" size="18">mdi-restart</v-icon> Confirm Restart</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Restart <strong>{{ appName }}</strong> on {{ env?.name }}?</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="restartDialog=false">Cancel</v-btn>
        <v-btn color="warning" variant="flat" prepend-icon="mdi-restart" class="btn-confirm" :loading="busy" @click="restartApp">Restart</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Stop dialog -->
  <v-dialog v-model="stopDialog" max-width="380" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-stop-circle-outline</v-icon> Confirm Stop</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Stop <strong>{{ appName }}</strong> on {{ env?.name }}?</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="stopDialog=false">Cancel</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-stop-circle-outline" class="btn-confirm" :loading="busy" @click="stopApp">Stop</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- PM2 reset dialog -->
  <v-dialog v-model="resetDialog" max-width="440" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="secondary" size="18">mdi-counter</v-icon> PM2 Reset</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <p class="text-body-2 mb-2">
          Reset PM2's counters for <strong>{{ appName }}</strong> — the restart count
          <span v-if="app">(currently <strong>{{ app.restarts || 0 }}</strong>)</span> and uptime go back to zero.
        </p>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Runs <code class="inline-code">pm2 reset</code> on {{ env?.name }}. The process is not restarted and keeps running.
        </p>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="resetDialog=false">Cancel</v-btn>
        <v-btn color="secondary" variant="flat" prepend-icon="mdi-counter" class="btn-confirm" :loading="busy" @click="resetApp">Reset</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Flush dialog -->
  <v-dialog v-model="flushDialog" max-width="420" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="secondary" size="18">mdi-delete-sweep-outline</v-icon> Flush Logs</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">Clear all log files for <strong>{{ appName }}</strong> on {{ env?.name }}? This cannot be undone.</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="flushDialog=false">Cancel</v-btn>
        <v-btn color="secondary" variant="flat" prepend-icon="mdi-delete-sweep-outline" class="btn-confirm" :loading="busy" @click="flushLogs">Flush</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete dialog -->
  <v-dialog v-model="deleteDialog" max-width="420" :persistent="busy">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-delete-outline</v-icon> Confirm Delete</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">
        Delete <strong>{{ appName }}</strong> on {{ env?.name }}? This permanently removes the process from PM2 on that server.
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="busy" @click="deleteDialog=false">Cancel</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-delete-outline" class="btn-confirm" :loading="busy" @click="deleteApp">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- PM2 describe dialog -->
  <v-dialog v-model="describeDialog" max-width="820" scrollable>
    <v-card class="dialog-card">
      <div class="dialog-title">
        <v-icon color="info" size="18">mdi-information-outline</v-icon> PM2 Describe
        <v-spacer />
        <v-btn icon="mdi-refresh" variant="text" size="small" :loading="describeLoading" title="Run again" @click="loadDescribe" />
      </div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <div class="cmd-line mb-3">
          <v-icon size="14" color="info" class="mr-2">mdi-console</v-icon>
          <code>pm2 describe {{ appName }}</code>
        </div>
        <div v-if="describeLoading" class="d-flex align-center justify-center py-8">
          <v-progress-circular indeterminate color="info" size="32" />
        </div>
        <pre v-else class="describe-box">{{ describeOutput }}</pre>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="describeDialog=false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlert } from '../composables/useAlert'
import { useBusy } from '../composables/useBusy'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

// One app on a remote pm2-agent server. Same shape as the local AppDetail view, minus the
// parts the agent deliberately does not expose (.env editing, git, restart-with-rename).
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { showAlert } = useAlert()
const { busy, run } = useBusy()

const envId = computed(() => route.params.id)
const appName = ref(route.params.appName)
const isRoot = computed(() => authStore.role === 'root')

const env = ref(null)
const app = ref(null)
const loading = ref(false)
const logsLoading = ref(false)
const loadError = ref('')
const showDetails = ref(true)
const acting = ref('')

const restartDialog = ref(false)
const stopDialog = ref(false)
const resetDialog = ref(false)
const flushDialog = ref(false)
const deleteDialog = ref(false)
const describeDialog = ref(false)
const describeLoading = ref(false)
const describeOutput = ref('')

const envTab = ref('current')
const envPath = ref('')
const envContent = ref('')
const envBackup = ref('')
const envEdit = ref('')
const envLoading = ref(false)
const envSaving = ref(false)
const envError = ref('')
const showEnv = ref(false)

// Values stay hidden until asked for — an .env on screen is a screenshot away from leaking
const maskedEnv = (raw) => String(raw || '').split('\n').map(line => {
  const eq = line.indexOf('=')
  if (eq === -1 || line.trimStart().startsWith('#')) return line
  return line.slice(0, eq + 1) + '\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf'
}).join('\n')

const NO_LOGS = 'No logs available'
const logType = ref('stdout')
const logs = ref({ stdout: NO_LOGS, stderr: NO_LOGS })

const REALTIME_INTERVAL_MS = 3000
const realtime = ref(false)
const logBox = ref(null)
const stickToBottom = ref(true)
let pollTimer = null
let polling = false

// PM2 reports node_args as an array, but an app started from an ecosystem file can carry a
// plain string — both have to render as one command-line fragment.
const nodeArgsText = computed(() => {
  const args = app.value?.node_args
  return Array.isArray(args) ? args.join(' ') : (args || '')
})

// The agent already strips ANSI codes; colouring here is the same keyword heuristic the
// local app detail view uses, so remote logs read the same way as local ones.
const logLines = computed(() =>
  String(logs.value[logType.value] || NO_LOGS).split('\n').map(text => {
    const l = text.toLowerCase()
    const level =
      l.includes('error') || l.includes('fatal') || l.includes('exception') ? 'error' :
      l.includes('warn') ? 'warn' :
      l.includes('info') ? 'info' :
      l.includes('debug') ? 'debug' : 'normal'
    return { text, level }
  })
)

const loadEnv = async () => {
  try {
    const res = await api.getEnvironment(envId.value)
    if (res.data.success) env.value = res.data.data
  } catch {
    // The app itself still loads — the header just falls back to a generic label
  }
}

// Root-only, and an agent older than this feature simply has no such route — a failure here
// leaves the panel empty with a reason rather than breaking the page.
const loadEnvFile = async () => {
  if (!isRoot.value) return
  envLoading.value = true
  envError.value = ''
  try {
    const res = await api.getEnvironmentAppEnv(envId.value, appName.value)
    if (res.data.success) {
      const d = res.data.data
      envPath.value = d.env_file_path || ''
      envContent.value = d.env_file_raw || ''
      envBackup.value = d.env_file_raw_backup || ''
      envEdit.value = d.env_file_raw || ''
    }
  } catch (e) {
    envError.value = e.response?.data?.error || 'Failed to read the .env file'
  } finally {
    envLoading.value = false
  }
}

const updateEnv = async () => {
  envSaving.value = true
  try {
    const res = await api.updateEnvironmentAppEnv(envId.value, appName.value, envEdit.value)
    if (res.data.success) {
      showAlert('Environment updated. Please restart the app.', 'success')
      envTab.value = 'current'
      await loadEnvFile()
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'Failed to update environment', 'error')
  } finally {
    envSaving.value = false
  }
}

const loadAppData = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.getEnvironmentApp(envId.value, appName.value)
    if (res.data.success) app.value = res.data.data.app
  } catch (e) {
    loadError.value = e.response?.data?.error || 'Failed to load app data'
  } finally {
    loading.value = false
  }
  await loadLogs()
}

const loadLogs = async () => {
  logsLoading.value = true
  const requested = logType.value
  try {
    const res = await api.getEnvironmentAppLogs(envId.value, appName.value, requested)
    // The pane can be switched while the request is in flight — dropping a late answer is
    // better than pasting stderr into the stdout pane.
    if (res.data.success && requested === logType.value) {
      logs.value[requested] = res.data.data.logs.lines || NO_LOGS
      scrollToBottom()
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'Failed to read logs', 'error')
  } finally {
    logsLoading.value = false
  }
}

// Following the tail is only helpful while the view is already at the bottom — once the
// user scrolls up to read something, yanking them back down would fight them.
const onLogScroll = () => {
  const el = logBox.value
  if (!el) return
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

const scrollToBottom = (force = false) => {
  if (force) stickToBottom.value = true
  nextTick(() => {
    const el = logBox.value
    if (el && stickToBottom.value) el.scrollTop = el.scrollHeight
  })
}

const pollLogs = async () => {
  // A slow agent must not stack requests up behind the interval
  if (polling || document.hidden) return
  polling = true
  const type = logType.value
  try {
    const res = await api.getEnvironmentAppLogs(envId.value, appName.value, type)
    if (res.data.success && type === logType.value) {
      logs.value[type] = res.data.data.logs.lines || NO_LOGS
      scrollToBottom()
    }
  } catch {
    // A failing poll would otherwise repeat every few seconds forever
    realtime.value = false
    showAlert('Realtime logs stopped — failed to read the log', 'error')
  } finally {
    polling = false
  }
}

const stopRealtime = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

const startRealtime = () => {
  stopRealtime()
  scrollToBottom(true)
  pollLogs()
  pollTimer = setInterval(pollLogs, REALTIME_INTERVAL_MS)
}

watch(realtime, (on) => { on ? startRealtime() : stopRealtime() })
watch(logType, () => { realtime.value ? (scrollToBottom(true), pollLogs()) : loadLogs() })

// Polling a background tab burns requests for output nobody is reading
const onVisibilityChange = () => { if (!document.hidden && realtime.value) pollLogs() }

/* -- Actions ---------------------------------------------------------------- */

const runAppAction = async (label, call) => {
  try {
    const res = await call()
    if (res.data.success) {
      showAlert(label, 'success')
      await loadAppData()
      return true
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'The action failed', 'error')
  }
  return false
}

const reloadApp = async () => {
  acting.value = 'reload'
  await runAppAction('App reloaded', () => api.reloadEnvironmentApp(envId.value, appName.value))
  acting.value = ''
}

const restartApp = () => run(async () => {
  await runAppAction('App restarted', () => api.restartEnvironmentApp(envId.value, appName.value))
  restartDialog.value = false
})

const stopApp = () => run(async () => {
  await runAppAction('App stopped', () => api.stopEnvironmentApp(envId.value, appName.value))
  stopDialog.value = false
})

const resetApp = () => run(async () => {
  await runAppAction('PM2 counters reset', () => api.resetEnvironmentApp(envId.value, appName.value))
  resetDialog.value = false
})

const flushLogs = () => run(async () => {
  await runAppAction('Logs flushed', () => api.flushEnvironmentApp(envId.value, appName.value))
  flushDialog.value = false
})

// The process is gone after this, so there is nothing left to show — go back to the server
const deleteApp = () => run(async () => {
  try {
    const res = await api.deleteEnvironmentApp(envId.value, appName.value)
    if (res.data.success) {
      showAlert('App deleted', 'success')
      router.push(`/environments/${envId.value}`)
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'Failed to delete', 'error')
  } finally {
    deleteDialog.value = false
  }
})

const loadDescribe = async () => {
  describeLoading.value = true
  try {
    const res = await api.getEnvironmentAppDescribe(envId.value, appName.value)
    describeOutput.value = res.data.data?.output || 'No output'
  } catch (e) {
    describeOutput.value = e.response?.data?.error || 'Failed to run pm2 describe'
  } finally {
    describeLoading.value = false
  }
}

const openDescribe = () => {
  describeOutput.value = ''
  describeDialog.value = true
  loadDescribe()
}

const statusColor = (s) => ({ online: 'success', stopped: 'warning', errored: 'error' }[s] || 'grey')
const statusIcon = (s) => ({ online: 'mdi-check-circle', stopped: 'mdi-stop-circle', errored: 'mdi-alert-circle' }[s] || 'mdi-help-circle')

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  loadEnv()
  loadAppData()
  loadEnvFile()
})

onUnmounted(() => {
  stopRealtime()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.top-strip { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.back-btn { text-transform:none; color:#94a3b8!important; }
.strip-val { font-size:.76rem; color:#94a3b8; font-weight:500; }
.font-mono { font-family:'Courier New', monospace; }

.app-header { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:14px 16px; }
.app-header-left { display:flex; align-items:center; gap:12px; min-width:0; }
.app-header-right { display:flex; align-items:center; }
.app-icon-wrap { width:38px; height:38px; border-radius:9px; background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.25); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.app-name { font-size:1rem; font-weight:700; color:#f1f5f9; letter-spacing:-.01em; }
.app-env { font-size:.68rem; text-transform:uppercase; letter-spacing:.07em; color:#64748b; font-weight:600; }
.toggle-btn { text-transform:none; font-weight:500; font-size:.72rem; border-color:rgba(255,255,255,.1)!important; color:#fff!important; }

.metric-row { display:flex; align-items:center; }
.metric-icon { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.metric-label { font-size:.63rem; letter-spacing:.07em; text-transform:uppercase; color:#94a3b8; font-weight:600; }
.metric-val { font-size:.95rem; font-weight:700; color:#f1f5f9; }
.metric-val.text-sm { font-size:.8rem; }
.green-tint { background:rgba(34,197,94,.12);  border:1px solid rgba(34,197,94,.2); }
.amber-tint { background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.2); }
.blue-tint  { background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.2); }
.cyan-tint  { background:rgba(6,182,212,.12);  border:1px solid rgba(6,182,212,.2); }

.info-row { display:flex; align-items:center; gap:6px; padding:3px 0; min-width:0; }
.info-key { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:#64748b; font-weight:600; white-space:nowrap; }
.info-val { font-size:.82rem; color:#e2e8f0; min-width:0; }

.realtime-toggle { display:flex; align-items:center; gap:6px; padding:0 8px; border-radius:8px; border:1px solid rgba(255,255,255,.07); }
.realtime-toggle--on { border-color:rgba(34,197,94,.35); background:rgba(34,197,94,.06); }
.realtime-switch :deep(.v-label) { font-size:.72rem; opacity:1; color:#94a3b8; }
.live-dot { width:7px; height:7px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 0 rgba(34,197,94,.6); animation:pulse 1.6s infinite; flex-shrink:0; }
@keyframes pulse {
  0%   { box-shadow:0 0 0 0 rgba(34,197,94,.5); }
  70%  { box-shadow:0 0 0 6px rgba(34,197,94,0); }
  100% { box-shadow:0 0 0 0 rgba(34,197,94,0); }
}

.log-box { height:560px; overflow-y:auto; overflow-x:hidden; background:#0b0d14; font-family:'Courier New',monospace; font-size:.82rem; line-height:1.6; padding:8px 0; }
.log-line { display:flex; align-items:baseline; padding:1px 12px; border-left:2px solid transparent; }
.log-line:hover { background:rgba(255,255,255,.04); }
.log-num { min-width:38px; color:#3a4659; font-size:.72rem; text-align:right; margin-right:14px; user-select:none; flex-shrink:0; }
.log-text { color:#c9d1d9; word-break:break-word; white-space:pre-wrap; flex:1; min-width:0; overflow-wrap:anywhere; }
.log-error { border-left-color:#ef4444; background:rgba(239,68,68,.07); }
.log-error .log-text { color:#fca5a5; }
.log-warn  { border-left-color:#f59e0b; background:rgba(245,158,11,.07); }
.log-warn  .log-text { color:#fde68a; }
.log-info  .log-text { color:#93c5fd; }
.log-debug .log-text { color:#6b7280; }

.resume-bar { display:flex; align-items:center; justify-content:center; padding:6px; font-size:.75rem; color:#a5b4fc; background:rgba(99,102,241,.12); cursor:pointer; }
.resume-bar:hover { background:rgba(99,102,241,.2); }

.tab-label { text-transform:none; font-size:.78rem; letter-spacing:0; }
.env-path { font-size:.68rem; color:#64748b; padding:6px 12px 0; font-family:'Courier New',monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.env-ta :deep(textarea) { font-family:'Courier New',monospace; font-size:.76rem; line-height:1.5; }

.cmd-line { display:flex; align-items:center; font-size:.78rem; color:#cbd5e1; }
.inline-code { background:rgba(255,255,255,.06); padding:1px 5px; border-radius:4px; font-size:.78rem; }
.describe-box { background:#0b0d14; border:1px solid rgba(255,255,255,.07); border-radius:8px; padding:12px 14px; font-family:'Courier New',monospace; font-size:.75rem; line-height:1.5; color:#cbd5e1; white-space:pre; overflow:auto; max-height:60vh; }
</style>
