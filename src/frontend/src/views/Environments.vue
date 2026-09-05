<template>
  <MainAppBar title="Environments" icon="mdi-server-network" :titleIconSize="20" @refresh="loadAll" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Summary strip -->
      <v-row dense class="mb-3">
        <v-col cols="6" sm="3">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.04s">
            <v-card-text class="pa-3">
              <div class="stat-label">Servers</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-primary">{{ environments.length }}</div>
                <div class="tint-box blue-tint"><v-icon size="15" color="primary">mdi-server</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.08s">
            <v-card-text class="pa-3">
              <div class="stat-label">Online</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-success">{{ onlineCount }}</div>
                <div class="tint-box green-tint"><v-icon size="15" color="success">mdi-check-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.12s">
            <v-card-text class="pa-3">
              <div class="stat-label">Unreachable</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-error">{{ offlineCount }}</div>
                <div class="tint-box red-tint"><v-icon size="15" color="error">mdi-alert-circle-outline</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="page-card stat-card fade-in" elevation="0" style="animation-delay:.16s">
            <v-card-text class="pa-3">
              <div class="stat-label">Remote Apps</div>
              <div class="stat-row mt-1">
                <div class="stat-value text-info">{{ remoteAppCount }}</div>
                <div class="tint-box cyan-tint"><v-icon size="15" color="info">mdi-apps</v-icon></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Environment cards -->
      <v-card class="page-card fade-in" elevation="0" :loading="loading" style="animation-delay:.2s">
        <template v-slot:loader="{ isActive }">
          <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
        </template>
        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="primary">mdi-server-network</v-icon>
            PM2 Agent Servers
            <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ environments.length }}</v-chip>
          </span>
          <v-spacer />
          <v-btn
            v-if="isRoot"
            color="primary" variant="flat" prepend-icon="mdi-plus"
            class="btn-primary-header" @click="openAdd"
          >
            Add Environment
          </v-btn>
        </div>
        <v-divider class="card-divider" />

        <v-card-text class="pa-4">
          <!-- Empty state -->
          <div v-if="!loading && environments.length === 0" class="empty-state">
            <v-icon size="40" color="grey">mdi-server-off</v-icon>
            <p class="mt-3 text-body-2 text-medium-emphasis">No environments configured yet.</p>
            <p class="text-caption text-medium-emphasis" style="max-width:520px">
              Install <span class="font-mono">pm2-agent</span> on the server you want to watch
              (copy the <span class="font-mono">pm2-agent</span> folder there and run
              <span class="font-mono">install.bat</span>), then add it here with its URL and the
              token the installer printed.
            </p>
            <v-btn v-if="isRoot" color="primary" variant="flat" prepend-icon="mdi-plus" class="mt-4" @click="openAdd">
              Add Environment
            </v-btn>
          </div>

          <div v-else class="env-list">
            <v-card
              v-for="env in environments"
              :key="env.id"
              class="env-card"
              elevation="0"
              :class="{ 'env-card--offline': env.online === false, 'env-card--disabled': !env.enabled }"
            >
              <v-card-text class="pa-4">
                <div class="env-row">

                  <!-- Identity -->
                  <div class="env-cell env-cell--id">
                    <div class="d-flex align-center gap-2">
                      <router-link :to="`/environments/${env.id}`" class="env-name">{{ env.name }}</router-link>
                      <v-chip v-if="!env.enabled" size="x-small" variant="tonal" color="grey">disabled</v-chip>
                    </div>
                    <div class="env-url font-mono">{{ env.url }}</div>
                    <div v-if="env.description" class="env-desc">{{ env.description }}</div>
                    <div v-if="env.online" class="host-line mt-2">
                      <span v-if="env.host?.hostname" class="host-item">
                        <v-icon size="12" class="mr-1">mdi-desktop-tower</v-icon>{{ env.host.hostname }}
                      </span>
                      <span v-if="env.host?.ip" class="host-item">
                        <v-icon size="12" class="mr-1">mdi-ip-network-outline</v-icon>{{ env.host.ip }}
                      </span>
                      <span v-if="env.node?.node" class="host-item">
                        <v-icon size="12" class="mr-1">mdi-nodejs</v-icon>{{ env.node.node }}
                      </span>
                    </div>
                  </div>

                  <!-- Status + process counts -->
                  <div class="env-cell env-cell--status">
                    <v-chip :color="statusColor(env)" variant="tonal" size="small">
                      <v-icon start size="12">{{ statusIcon(env) }}</v-icon>
                      {{ statusText(env) }}
                    </v-chip>
                    <div v-if="env.online" class="d-flex gap-2 flex-wrap mt-2">
                      <v-chip size="small" variant="tonal" color="success">{{ env.counts?.online ?? 0 }} online</v-chip>
                      <v-chip size="small" variant="tonal" color="warning">{{ env.counts?.stopped ?? 0 }} stopped</v-chip>
                      <v-chip size="small" variant="tonal" color="error">{{ env.counts?.errored ?? 0 }} errored</v-chip>
                    </div>
                  </div>

                  <!-- Live figures -->
                  <div class="env-cell env-cell--metrics">
                    <template v-if="env.online">
                      <div class="metric mb-2">
                        <div class="metric-head">
                          <span>CPU</span>
                          <span class="metric-val">{{ env.cpu?.usage ?? 0 }}%</span>
                        </div>
                        <v-progress-linear :model-value="env.cpu?.usage ?? 0" :color="barColor(env.cpu?.usage)" height="4" rounded bg-color="rgba(255,255,255,0.07)" />
                      </div>
                      <div class="metric">
                        <div class="metric-head">
                          <span>Memory</span>
                          <span class="metric-val">{{ env.memory?.percent ?? 0 }}% of {{ formatBytes(env.memory?.total) }}</span>
                        </div>
                        <v-progress-linear :model-value="env.memory?.percent ?? 0" :color="barColor(env.memory?.percent)" height="4" rounded bg-color="rgba(255,255,255,0.07)" />
                      </div>
                    </template>
                    <div v-else-if="env.online === null" class="checking-line">
                      <v-progress-circular indeterminate size="14" width="2" color="primary" class="mr-2" />
                      Checking…
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="env-cell env-cell--actions">
                    <v-btn
                      size="small" variant="tonal" color="primary" prepend-icon="mdi-eye-outline"
                      class="action-btn btn-view" :to="`/environments/${env.id}`"
                    >
                      View
                    </v-btn>
                    <template v-if="isRoot">
                      <v-btn
                        size="small" variant="tonal" color="info" prepend-icon="mdi-lan-connect"
                        class="action-btn btn-test" :loading="testingId === env.id" @click="testSaved(env)"
                      >
                        Test
                      </v-btn>
                      <v-btn
                        size="small" variant="tonal" color="warning" prepend-icon="mdi-pencil-outline"
                        class="action-btn btn-edit" @click="openEdit(env)"
                      >
                        Edit
                      </v-btn>
                      <v-btn
                        size="small" variant="tonal" color="error" prepend-icon="mdi-delete-outline"
                        class="action-btn btn-delete" @click="openDelete(env)"
                      >
                        Delete
                      </v-btn>
                    </template>
                  </div>
                </div>

                <!-- Offline reason -->
                <v-alert
                  v-if="env.online === false && env.error"
                  type="error" variant="tonal" density="compact" class="mt-3 text-caption"
                >
                  {{ env.error }}
                </v-alert>
              </v-card-text>
            </v-card>
          </div>
        </v-card-text>
      </v-card>

    </v-container>
  </v-main>

  <!-- Add / Edit dialog -->
  <v-dialog v-model="envDialog" max-width="560" :persistent="saving">
    <v-card class="dialog-card">
      <div class="dialog-title">
        <v-icon :color="isEditing ? 'primary' : 'success'" size="18">
          {{ isEditing ? 'mdi-server-plus-outline' : 'mdi-server-plus' }}
        </v-icon>
        {{ isEditing ? 'Edit Environment' : 'Add Environment' }}
      </div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <v-form ref="envForm" v-model="formValid">
          <div class="field-label mb-1">Name</div>
          <v-text-field
            v-model="edited.name" variant="outlined" density="compact" class="mb-3"
            placeholder="Production LIS" :rules="[v => !!v || 'Required']"
          />

          <div class="field-label mb-1">Agent URL</div>
          <v-text-field
            v-model="edited.url" variant="outlined" density="compact" class="mb-3"
            placeholder="http://10.0.0.5:7003"
            :rules="[v => !!v || 'Required', v => /^https?:\/\//i.test(v || '') || 'Must start with http:// or https://']"
          />

          <div class="field-label mb-1">
            Agent Token{{ isEditing ? ' (leave blank to keep the stored one)' : '' }}
          </div>
          <v-text-field
            v-model="edited.token" variant="outlined" density="compact" class="mb-3"
            type="password" autocomplete="new-password"
            placeholder="AGENT_TOKEN from the agent's .env"
            :rules="isEditing ? [] : [v => !!v || 'Required', v => (v || '').length >= 16 || 'At least 16 characters']"
          />

          <div class="field-label mb-1">Description</div>
          <v-text-field
            v-model="edited.description" variant="outlined" density="compact" class="mb-2"
            placeholder="Optional note"
          />

          <v-switch
            v-model="edited.enabled" color="primary" density="compact" hide-details
            label="Enabled (poll this server)" class="mb-1"
          />
          <v-switch
            v-model="edited.allow_insecure_tls" color="warning" density="compact" hide-details
            label="Allow self-signed TLS certificate" class="mb-2"
          />
          <div v-if="edited.allow_insecure_tls" class="text-caption text-medium-emphasis mb-2">
            Certificate validation is skipped for this server. Only use on a trusted network.
          </div>

          <!-- Inline connection test -->
          <v-alert
            v-if="testResult"
            :type="testResult.reachable ? 'success' : 'error'"
            variant="tonal" density="compact" class="text-caption mt-2"
          >
            <template v-if="testResult.reachable">
              Connected in {{ testResult.latencyMs }} ms —
              {{ testResult.host?.hostname }} ({{ testResult.host?.distro || testResult.host?.platform }}),
              PM2 {{ testResult.pm2 ? 'reachable' : 'NOT reachable' }}
            </template>
            <template v-else>{{ testResult.error }}</template>
          </v-alert>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-btn
          variant="tonal" prepend-icon="mdi-lan-connect" class="action-btn"
          :loading="testing" :disabled="!canTestDialog" @click="testDialog"
        >
          Test Connection
        </v-btn>
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="saving" @click="envDialog = false">Cancel</v-btn>
        <v-btn
          variant="flat" color="primary" class="btn-confirm"
          :prepend-icon="isEditing ? 'mdi-content-save-outline' : 'mdi-plus'"
          :loading="saving" :disabled="!formValid" @click="save"
        >
          {{ isEditing ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete dialog -->
  <v-dialog v-model="deleteDialog" max-width="400" :persistent="saving">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-delete-outline</v-icon> Confirm Delete</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">
        Remove environment <strong>{{ envToDelete?.name }}</strong>?
        This only removes it from this dashboard — the agent on that server keeps running.
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" :disabled="saving" @click="deleteDialog = false">Cancel</v-btn>
        <v-btn variant="flat" color="error" prepend-icon="mdi-delete-outline" class="btn-confirm" :loading="saving" @click="remove">
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const authStore = useAuthStore()
const { showAlert } = useAlert()

const isRoot = computed(() => authStore.role === 'root')

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testingId = ref(null)
const environments = ref([])

const envDialog = ref(false)
const deleteDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const envForm = ref(null)
const envToDelete = ref(null)
const testResult = ref(null)

const blankEnv = () => ({
  id: null, name: '', url: '', token: '', description: '',
  enabled: true, allow_insecure_tls: false
})
const edited = ref(blankEnv())

const onlineCount = computed(() => environments.value.filter(e => e.online === true).length)
const offlineCount = computed(() => environments.value.filter(e => e.online === false).length)
const remoteAppCount = computed(() =>
  environments.value.reduce((sum, e) => sum + (e.counts?.total || 0), 0)
)

// An edit dialog can test with a blank token (the stored one is used); a new one cannot.
const canTestDialog = computed(() =>
  !!edited.value.url && (isEditing.value ? !!edited.value.id : (edited.value.token || '').length >= 16)
)

// The list renders immediately from the DB; live figures arrive with the overview call and
// are merged in, so a slow or unreachable server never holds up the page.
const loadAll = async () => {
  loading.value = true
  try {
    const res = await api.getEnvironments()
    if (res.data.success) {
      environments.value = res.data.data.map(e => ({ ...e, online: e.enabled ? null : false }))
    }
  } catch {
    showAlert('Failed to load environments', 'error')
    loading.value = false
    return
  }
  loading.value = false
  loadOverview()
}

const loadOverview = async () => {
  if (environments.value.length === 0) return
  try {
    const res = await api.getEnvironmentsOverview()
    if (!res.data.success) return
    const byId = new Map(res.data.data.map(e => [e.id, e]))
    environments.value = environments.value.map(env => {
      const live = byId.get(env.id)
      // Disabled environments are absent from the overview by design — leave them as-is
      // rather than marking them unreachable.
      if (!live) return env.enabled ? { ...env, online: false, error: 'No data returned' } : env
      return { ...env, ...live }
    })
  } catch {
    environments.value = environments.value.map(e => e.enabled ? { ...e, online: false, error: 'Overview request failed' } : e)
  }
}

const openAdd = () => {
  isEditing.value = false
  edited.value = blankEnv()
  testResult.value = null
  envDialog.value = true
}

const openEdit = (env) => {
  isEditing.value = true
  // token stays blank: the server never sends it back, and blank means "keep it"
  edited.value = { ...env, token: '' }
  testResult.value = null
  envDialog.value = true
}

const save = async () => {
  if (!formValid.value) return
  saving.value = true
  try {
    const payload = {
      name: edited.value.name,
      url: edited.value.url,
      token: edited.value.token,
      description: edited.value.description,
      enabled: edited.value.enabled,
      allow_insecure_tls: edited.value.allow_insecure_tls
    }
    const res = isEditing.value
      ? await api.updateEnvironment(edited.value.id, payload)
      : await api.createEnvironment(payload)
    if (res.data.success) {
      showAlert(isEditing.value ? 'Environment updated' : 'Environment created', 'success')
      envDialog.value = false
      loadAll()
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'Operation failed', 'error')
  } finally {
    saving.value = false
  }
}

const testDialog = async () => {
  testing.value = true
  testResult.value = null
  try {
    // Editing with a blank token tests the saved environment, so the stored token is used
    const useSaved = isEditing.value && !edited.value.token
    const res = await api.testEnvironment(
      useSaved ? edited.value.id : null,
      {
        url: edited.value.url,
        token: edited.value.token,
        allow_insecure_tls: edited.value.allow_insecure_tls
      }
    )
    if (res.data.success) testResult.value = res.data.data
  } catch (e) {
    testResult.value = { reachable: false, error: e.response?.data?.error || 'Connection test failed' }
  } finally {
    testing.value = false
  }
}

const testSaved = async (env) => {
  testingId.value = env.id
  try {
    const res = await api.testEnvironment(env.id)
    const data = res.data.data
    if (data.reachable) {
      showAlert(`${env.name}: reachable in ${data.latencyMs} ms (PM2 ${data.pm2 ? 'OK' : 'not reachable'})`, 'success')
    } else {
      showAlert(`${env.name}: ${data.error}`, 'error')
    }
    loadOverview()
  } catch (e) {
    showAlert(e.response?.data?.error || 'Connection test failed', 'error')
  } finally {
    testingId.value = null
  }
}

const openDelete = (env) => { envToDelete.value = env; deleteDialog.value = true }

const remove = async () => {
  saving.value = true
  try {
    const res = await api.deleteEnvironment(envToDelete.value.id)
    if (res.data.success) {
      showAlert('Environment deleted', 'success')
      deleteDialog.value = false
      loadAll()
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'Failed to delete environment', 'error')
  } finally {
    saving.value = false
  }
}

const statusColor = (env) => {
  if (!env.enabled) return 'grey'
  if (env.online === true) return 'success'
  if (env.online === false) return 'error'
  return 'grey'
}
const statusIcon = (env) => {
  if (!env.enabled) return 'mdi-pause-circle-outline'
  if (env.online === true) return 'mdi-check-circle-outline'
  if (env.online === false) return 'mdi-alert-circle-outline'
  return 'mdi-help-circle-outline'
}
const statusText = (env) => {
  if (!env.enabled) return 'Disabled'
  if (env.online === true) return 'Online'
  if (env.online === false) return 'Unreachable'
  return 'Checking'
}

const barColor = (v) => (v >= 85 ? 'error' : v >= 60 ? 'warning' : 'success')

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

onMounted(loadAll)
</script>

<style scoped>
.stat-card { height:100%; }
.stat-label { font-size:.63rem; letter-spacing:.07em; text-transform:uppercase; color:#fff; font-weight:600; }
.stat-row { display:flex; align-items:center; justify-content:space-between; }
.stat-value { font-size:1.65rem; font-weight:700; line-height:1; letter-spacing:-.02em; }
.tint-box { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.green-tint { background:rgba(34,197,94,.12);  border:1px solid rgba(34,197,94,.2); }
.red-tint   { background:rgba(239,68,68,.12);  border:1px solid rgba(239,68,68,.2); }
.blue-tint  { background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.2); }
.cyan-tint  { background:rgba(6,182,212,.12);  border:1px solid rgba(6,182,212,.2); }

.env-list { display:flex; flex-direction:column; gap:10px; }

.env-card {
  background: rgba(255,255,255,.02) !important;
  border: 1px solid rgba(255,255,255,.07) !important;
  border-radius: 10px !important;
  width: 100%;
  transition: border-color .15s;
}

/* One server per row: identity grows, the rest keep a fixed share, and everything
   stacks once the viewport is too narrow for four columns. */
.env-row { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
.env-cell { min-width:0; }
.env-cell--id { flex:1 1 260px; }
.env-cell--status { flex:0 1 auto; }
.env-cell--metrics { flex:0 1 300px; min-width:220px; }
.env-cell--actions { flex:0 0 auto; display:flex; align-items:center; gap:6px; margin-left:auto; }

@media (max-width: 700px) {
  .env-cell--metrics, .env-cell--status { flex:1 1 100%; }
  .env-cell--actions { margin-left:0; flex-wrap:wrap; }
}
.env-card:hover { border-color: rgba(99,102,241,.35) !important; }
.env-card--offline { border-color: rgba(239,68,68,.25) !important; }
.env-card--disabled { opacity: .65; }

.env-name { font-size:.95rem; font-weight:700; color:#fff!important; text-decoration:none; }
.env-name:hover { color:#a5b4fc!important; }
.env-url { font-size:.72rem; color:#94a3b8; margin-top:2px; word-break:break-all; }
.env-desc { font-size:.72rem; color:#64748b; margin-top:3px; }

.host-line { display:flex; flex-wrap:wrap; gap:10px; }
.host-item { display:inline-flex; align-items:center; font-size:.7rem; color:#94a3b8; }

.metric-head { display:flex; justify-content:space-between; font-size:.68rem; color:#94a3b8; margin-bottom:3px; }
.metric-val { color:#e2e8f0; font-weight:600; }

.checking-line { display:flex; align-items:center; font-size:.75rem; color:#94a3b8; }

/* Row actions share one shape; only the tint tells them apart. */
.env-cell--actions .action-btn {
  text-transform:none;
  letter-spacing:0;
  font-weight:600;
  min-width:84px;
}
.btn-view   { background:rgba(99,102,241,.14)!important; border:1px solid rgba(99,102,241,.28)!important; }
.btn-test   { background:rgba(6,182,212,.14)!important;  border:1px solid rgba(6,182,212,.28)!important; }
.btn-edit   { background:rgba(245,158,11,.14)!important; border:1px solid rgba(245,158,11,.28)!important; }
.btn-delete { background:rgba(239,68,68,.14)!important;  border:1px solid rgba(239,68,68,.28)!important; }
.btn-view:hover   { background:rgba(99,102,241,.24)!important; }
.btn-test:hover   { background:rgba(6,182,212,.24)!important; }
.btn-edit:hover   { background:rgba(245,158,11,.24)!important; }
.btn-delete:hover { background:rgba(239,68,68,.24)!important; }
.empty-state { display:flex; flex-direction:column; align-items:center; text-align:center; padding:40px 16px; }
.font-mono { font-family:'Courier New', monospace; }
.field-label { font-size:.78rem; font-weight:500; color:#94a3b8; }
</style>
