<template>
  <MainAppBar :title="appName" icon="mdi-application-outline" :titleIconSize="20" showBack @refresh="loadAppData" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Loading skeleton -->
      <div v-if="loading && !app" class="d-flex flex-column align-center justify-center" style="min-height:360px">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
        <span class="text-body-2 text-medium-emphasis">Loading application data...</span>
      </div>

      <template v-if="app">
        <!-- Status card -->
        <v-card class="page-card fade-in mb-4" elevation="0" :loading="loading">
          <template v-slot:loader="{ isActive }">
            <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
          </template>

          <!-- Header row -->
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
                <v-col cols="12" md="6" v-if="app.git_branch">
                  <div class="info-row"><v-icon size="15" color="warning" class="mr-2">mdi-source-branch</v-icon><span class="info-key">Branch:</span><span class="info-val">{{ app.git_branch }}</span></div>
                </v-col>
                <v-col cols="12" md="6" v-if="app.git_commit">
                  <div class="info-row"><v-icon size="15" color="warning" class="mr-2">mdi-source-commit</v-icon><span class="info-key">Commit:</span><span class="info-val">{{ app.git_commit }}</span></div>
                </v-col>
                <v-col cols="12" md="6" v-if="app.port_http">
                  <div class="info-row"><v-icon size="15" color="primary" class="mr-2">mdi-web</v-icon><span class="info-key">HTTP:</span>
                    <a :href="`http://${app.app_base_url}:${app.port_http}`" target="_blank" class="info-link">http://{{ app.app_base_url }}:{{ app.port_http }}</a>
                  </div>
                </v-col>
                <v-col cols="12" md="6" v-if="app.port_https">
                  <div class="info-row"><v-icon size="15" color="success" class="mr-2">mdi-lock-outline</v-icon><span class="info-key">HTTPS:</span>
                    <a :href="`https://${app.app_base_url}:${app.port_https}`" target="_blank" class="info-link">https://{{ app.app_base_url }}:{{ app.port_https }}</a>
                  </div>
                </v-col>
                <v-col cols="12" v-if="app.exec_path">
                  <div class="info-row"><v-icon size="15" color="info" class="mr-2">mdi-console</v-icon><span class="info-key">Exec:</span><span class="info-val text-truncate">{{ app.exec_path }}</span></div>
                </v-col>
              </v-row>
            </v-card-text>
          </template>

          <!-- Actions -->
          <template v-if="authStore.role === 'root'">
            <v-divider class="card-divider" />
            <v-card-actions class="pa-4 flex-wrap gap-2">
              <v-btn v-if="!app.name.includes('pm2')" size="small" color="secondary" variant="tonal" class="action-btn" @click="flushDialog=true">
                <v-icon size="15" class="mr-1">mdi-delete-sweep-outline</v-icon>Flush Logs
              </v-btn>
              <v-btn v-if="app.status==='online'" size="small" color="success" variant="tonal" class="action-btn" @click="reloadApp">
                <v-icon size="15" class="mr-1">mdi-reload</v-icon>Reload
              </v-btn>
              <v-btn size="small" color="warning" variant="tonal" class="action-btn" @click="confirmRestart">
                <v-icon size="15" class="mr-1">mdi-restart</v-icon>Restart
              </v-btn>
              <v-btn v-if="app.status==='online' && !app.name.includes('pm2')" size="small" color="error" variant="tonal" class="action-btn" @click="stopApp">
                <v-icon size="15" class="mr-1">mdi-stop</v-icon>Stop
              </v-btn>
              <v-btn v-if="!app.name.includes('pm2') && (app.status==='stopped'||app.status==='errored')" size="small" color="error" variant="tonal" class="action-btn" @click="deleteDialog=true">
                <v-icon size="15" class="mr-1">mdi-delete-outline</v-icon>Delete
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>

        <!-- Env + Logs row -->
        <v-row>
          <!-- Env panel -->
          <v-col v-if="authStore.role==='root'" cols="12" md="4">
            <v-card class="page-card fade-in h-100" elevation="0" style="animation-delay:.08s">
              <v-tabs v-model="envTab" bg-color="transparent" color="primary" density="compact">
                <v-tab value="current" class="tab-label">Current .env</v-tab>
                <v-tab value="backup" v-if="envBackup" class="tab-label">Backup .env</v-tab>
                <v-tab value="edit" class="tab-label">Update .env</v-tab>
              </v-tabs>
              <v-divider class="card-divider" />
              <v-card-text class="pa-3">
                <v-window v-model="envTab">
                  <v-window-item value="current">
                    <v-textarea :model-value="envContent" variant="outlined" rows="22" readonly class="env-ta" hide-details />
                  </v-window-item>
                  <v-window-item value="backup" v-if="envBackup">
                    <v-textarea :model-value="envBackup" variant="outlined" rows="22" readonly class="env-ta" hide-details />
                  </v-window-item>
                  <v-window-item value="edit">
                    <v-alert type="warning" variant="tonal" density="compact" class="mb-3 text-caption">
                      Restart the application after updating .env
                    </v-alert>
                    <v-textarea v-model="envEdit" variant="outlined" rows="19" class="env-ta mb-3" hide-details />
                    <v-btn v-if="authStore.role==='root'" color="primary" variant="flat" block size="small" @click="updateEnv" :disabled="!envEdit||envEdit===envContent">
                      <v-icon size="15" class="mr-1">mdi-content-save-outline</v-icon>Save .env
                    </v-btn>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Logs panel -->
          <v-col cols="12" :md="authStore.role==='root' ? 8 : 12">
            <v-card class="page-card fade-in" elevation="0" style="animation-delay:.12s" :loading="loading">
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
                  <v-btn value="stdout" class="action-btn">
                    <v-icon size="13" class="mr-1">mdi-console</v-icon>Output
                  </v-btn>
                  <v-btn value="stderr" class="action-btn">
                    <v-icon size="13" class="mr-1">mdi-alert-circle-outline</v-icon>Error
                  </v-btn>
                </v-btn-toggle>
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-download-outline" class="action-btn" :href="`/apps/${appName}/${logType==='stdout'?'outlog':'errorlog'}/download`" target="_blank">Download</v-btn>
              </div>
              <v-divider class="card-divider" />
              <v-card-text class="pa-0">
                <div class="log-box">
                  <div v-for="(line, i) in logLines" :key="i" :class="['log-line', `log-${line.level}`]">
                    <span class="log-num">{{ i + 1 }}</span>
                    <span class="log-text">{{ line.text }}</span>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>
  </v-main>

  <!-- Delete dialog -->
  <v-dialog v-model="deleteDialog" max-width="420">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-delete-outline</v-icon> Confirm Delete</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <p class="text-body-2">Delete <strong>{{ appName }}</strong>? This permanently removes the PM2 process.</p>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="deleteDialog=false">Cancel</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-delete-outline" class="btn-confirm" @click="deleteApp">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Restart dialog -->
  <v-dialog v-model="restartDialog" max-width="460">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="warning" size="18">mdi-restart</v-icon> Restart Application</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <p class="text-body-2 text-medium-emphasis mb-4">You can optionally rename the application during restart.</p>
        <div class="field-label mb-1">Application Name</div>
        <v-text-field v-model="newAppName" variant="outlined" density="compact" class="mb-3" hide-details="auto" />
        <div class="field-label mb-1">Node Arguments</div>
        <v-text-field v-model="nodeArgsEdit" variant="outlined" density="compact" placeholder="--expose-gc --max-old-space-size=1024" hide-details="auto" />
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="restartDialog=false">Cancel</v-btn>
        <v-btn color="warning" variant="flat" prepend-icon="mdi-restart" class="btn-confirm" :disabled="!newAppName" @click="restartApp">Restart</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Flush dialog -->
  <v-dialog v-model="flushDialog" max-width="420">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="secondary" size="18">mdi-delete-sweep-outline</v-icon> Flush Logs</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <p class="text-body-2">Clear all log files for <strong>{{ appName }}</strong>? This cannot be undone.</p>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="flushDialog=false">Cancel</v-btn>
        <v-btn color="secondary" variant="flat" prepend-icon="mdi-delete-sweep-outline" class="btn-confirm" @click="flushLogs">Flush</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { showAlert } = useAlert()

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

const deleteDialog = ref(false)
const restartDialog = ref(false)
const flushDialog = ref(false)
const newAppName = ref('')
const nodeArgsEdit = ref('')

const rawLogs = computed(() => logs.value[logType.value] || 'No logs available')

const logLines = computed(() =>
  rawLogs.value.split(/\n|<br\s*\/?>/i).map(text => {
    const l = text.toLowerCase()
    const level =
      l.includes('error') || l.includes('fatal') || l.includes('exception') ? 'error' :
      l.includes('warn') ? 'warn' :
      l.includes('info') ? 'info' :
      l.includes('debug') ? 'debug' : 'normal'
    return { text, level }
  })
)

const loadAppData = async () => {
  loading.value = true
  try {
    const res = await api.getApp(appName.value)
    if (res.data.success) {
      app.value = res.data.data.app
      logs.value.stdout = res.data.data.logs.stdout.lines || 'No logs available'
      logs.value.stderr = res.data.data.logs.stderr.lines || 'No logs available'
      envContent.value = res.data.data.app.env_file_raw || ''
      envBackup.value = res.data.data.app.env_file_raw_backup || ''
      envEdit.value = res.data.data.app.env_file_raw || ''
    }
  } catch { showAlert('Failed to load app data', 'error') }
  finally { loading.value = false }
}

const updateEnv = async () => {
  try {
    await api.updateAppEnv(appName.value, envEdit.value)
    showAlert('Environment updated. Please restart the app.', 'success')
    envTab.value = 'current'
    loadAppData()
  } catch { showAlert('Failed to update environment', 'error') }
}

const reloadApp = async () => {
  try { await api.reloadApp(appName.value); showAlert('App reloaded', 'success'); loadAppData() }
  catch { showAlert('Failed to reload', 'error') }
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
    showAlert(`App restarted as: ${newAppName.value}`, 'success')
    restartDialog.value = false
    if (oldName !== newAppName.value) { appName.value = newAppName.value; router.replace(`/apps/${newAppName.value}`) }
    loadAppData()
  } catch { showAlert('Failed to restart', 'error'); restartDialog.value = false }
}

const stopApp = async () => {
  try { await api.stopApp(appName.value); showAlert('App stopped', 'success'); loadAppData() }
  catch { showAlert('Failed to stop', 'error') }
}

const flushLogs = async () => {
  try { await api.flushAppLogs(appName.value); showAlert('Logs flushed', 'success'); flushDialog.value = false; loadAppData() }
  catch { showAlert('Failed to flush logs', 'error'); flushDialog.value = false }
}

let _redirectTimer = null
const deleteApp = async () => {
  try {
    await api.deleteApp(appName.value)
    showAlert('App deleted', 'success')
    deleteDialog.value = false
    _redirectTimer = setTimeout(() => router.push('/apps'), 1200)
  } catch { showAlert('Failed to delete', 'error'); deleteDialog.value = false }
}

onUnmounted(() => { if (_redirectTimer) clearTimeout(_redirectTimer) })

const statusColor = (s) => ({ online: 'success', stopped: 'warning', errored: 'error' }[s] || 'grey')
const statusIcon  = (s) => ({ online: 'mdi-check-circle', stopped: 'mdi-stop-circle', errored: 'mdi-alert-circle' }[s] || 'mdi-help-circle')

const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B'
  const k = 1024, sizes = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`
}

onMounted(loadAppData)
</script>

<style scoped>
/* App header */
.app-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:14px 16px; }
.app-header-left { display:flex; align-items:center; gap:12px; }
.app-header-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.app-icon-wrap { width:38px; height:38px; background:rgba(99,102,241,.15); border:1px solid rgba(99,102,241,.3); border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.app-name { font-size:1rem; font-weight:700; color:#f1f5f9; line-height:1.2; }
.app-env { font-size:.72rem; color:#64748b; margin-top:2px; }
.toggle-btn { text-transform:none; font-size:.75rem; border-color:rgba(255,255,255,.1)!important; color:#94a3b8!important; }

/* Metrics */
.metric-row { display:flex; align-items:center; padding:8px 0; }
.metric-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.metric-label { font-size:.68rem; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; font-weight:500; }
.metric-val { font-size:1rem; font-weight:700; color:#f1f5f9; line-height:1.2; }
.text-sm { font-size:.85rem!important; }
.cyan-tint  { background:rgba(6,182,212,.12);  border:1px solid rgba(6,182,212,.2); }
.green-tint { background:rgba(34,197,94,.12);  border:1px solid rgba(34,197,94,.2); }
.amber-tint { background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.2); }
.blue-tint  { background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.2); }

/* Info rows */
.info-row { display:flex; align-items:center; padding:5px 0; font-size:.82rem; }
.info-key { color:#64748b; margin-right:6px; white-space:nowrap; }
.info-val { color:#e2e8f0; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.info-link { color:#a5b4fc!important; font-weight:500; }

/* Action buttons */
.action-btn { font-size:.8rem !important; }

/* Tabs */
.tab-label { text-transform:none; font-size:.8rem; letter-spacing:0; }

/* Env textarea */
.env-ta :deep(.v-field__input) { font-family:'Courier New',monospace; font-size:.8rem; line-height:1.5; }

/* Log box */
.log-box { height:580px; overflow-y:auto; overflow-x:hidden; background:#0b0d14; font-family:'Courier New',monospace; font-size:.82rem; line-height:1.6; padding:8px 0; }
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

/* Dialog */
.field-label { font-size:.78rem; font-weight:500; color:#94a3b8; }
</style>
