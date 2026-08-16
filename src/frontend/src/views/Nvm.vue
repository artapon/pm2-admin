<template>
  <MainAppBar title="NVM" icon="mdi-nodejs" :titleIconSize="20" @refresh="loadInfo" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Loading -->
      <div v-if="loading" class="d-flex flex-column align-center justify-center" style="min-height:360px">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
        <span class="text-body-2 text-medium-emphasis">Loading Node.js versions...</span>
      </div>

      <template v-else>

        <!-- nvm missing -->
        <v-card v-if="!info.installed" class="page-card fade-in" elevation="0">
          <div class="card-header">
            <v-icon size="16" color="warning">mdi-alert-circle-outline</v-icon>
            <span class="card-title">nvm Not Detected</span>
          </div>
          <v-divider class="card-divider" />
          <v-card-text class="pa-4">
            <p class="text-body-2 text-medium-emphasis mb-3">
              nvm lets this server keep several Node.js runtimes side by side, so each PM2 app can
              run on the version it needs. It was not found at <code class="inline-code">{{ info.root }}</code>.
            </p>
            <div v-if="info.error" class="text-body-2 text-medium-emphasis mb-3">
              <v-icon size="14" color="error" class="mr-1">mdi-information-outline</v-icon>
              {{ info.error }}
            </div>
            <div class="cmd-box mb-2">
              <v-icon size="14" color="primary" class="mr-2">mdi-console</v-icon>
              <code class="cmd">{{ info.isWindows
                ? 'Install nvm-windows: https://github.com/coreybutler/nvm-windows/releases'
                : 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash' }}</code>
            </div>
            <div class="field-hint">
              Install it on the server, then restart pm2-admin so it picks up the new environment variables.
            </div>
          </v-card-text>
        </v-card>

        <template v-else>

          <!-- Install a version -->
          <v-card class="page-card fade-in mb-4" elevation="0">
            <div class="card-header">
              <span class="card-title">
                <v-icon size="15" color="primary">mdi-download-outline</v-icon>
                Install Node.js Version
              </span>
              <v-spacer />
              <v-chip size="small" color="success" variant="tonal">
                <v-icon start size="11">mdi-check-circle</v-icon>
                nvm {{ info.nvmVersion || 'detected' }}
              </v-chip>
            </div>
            <v-divider class="card-divider" />

            <v-card-text class="pa-4">
              <v-row align="start">
                <v-col cols="12" md="5">
                  <div class="field-label mb-1">Version</div>
                  <v-combobox
                    v-model="versionToInstall"
                    :items="availableItems"
                    :loading="loadingAvailable"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    placeholder="20.19.0"
                    :disabled="installing"
                  />
                  <div class="field-hint">
                    Pick a published version or type one as <code>x.y.z</code>.
                    <a class="link" href="#" @click.prevent="loadAvailable">
                      {{ available.length ? 'Refresh' : 'Load' }} the published list
                    </a>
                  </div>
                </v-col>
                <v-col cols="12" md="7" class="d-flex align-start">
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="small"
                    prepend-icon="mdi-download-outline"
                    class="mt-6"
                    :loading="installing"
                    :disabled="!parsedVersion"
                    @click="install"
                  >
                    Install
                  </v-btn>
                </v-col>
              </v-row>

              <div class="field-hint mt-2">
                <v-icon size="13" class="mr-1">mdi-information-outline</v-icon>
                Downloading a runtime takes a while, and writing to
                <code>{{ info.root }}</code> needs the pm2-admin process to have permission there
                <template v-if="info.isWindows">(on Windows that means running as administrator)</template>.
                Installing does not switch the version PM2 itself runs on.
              </div>

              <pre v-if="installOutput" class="output-box mt-3">{{ installOutput }}</pre>
            </v-card-text>
          </v-card>

          <!-- Installed versions -->
          <v-card class="page-card fade-in" elevation="0">
            <div class="card-header">
              <span class="card-title">
                <v-icon size="15" color="primary">mdi-nodejs</v-icon>
                Installed Versions
                <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ info.versions.length }}</v-chip>
              </span>
              <v-spacer />
              <span class="root-path">{{ info.root }}</span>
            </div>
            <v-divider class="card-divider" />

            <v-data-table
              :headers="headers"
              :items="info.versions"
              class="data-table"
              hover
              density="comfortable"
              :items-per-page="25"
            >
              <template v-slot:item.version="{ item }">
                <div class="d-flex align-center gap-2">
                  <span class="font-weight-semibold font-mono">v{{ item.version }}</span>
                  <v-chip v-if="item.current" size="x-small" color="success" variant="tonal">
                    <v-icon start size="11">mdi-check-circle-outline</v-icon>in use
                  </v-chip>
                </div>
              </template>

              <template v-slot:item.interpreter="{ item }">
                <code class="interpreter-path">{{ item.interpreter }}</code>
              </template>

              <template v-slot:item.actions="{ item }">
                <div class="action-btns">
                  <v-btn
                    size="small"
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-content-copy"
                    class="action-btn"
                    @click="copy(interpreterFlag(item), '--interpreter flag')"
                  >
                    Copy --interpreter
                  </v-btn>
                  <v-tooltip text="Copy the path only" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        size="small"
                        variant="tonal"
                        icon="mdi-file-outline"
                        density="comfortable"
                        @click="copy(item.interpreter, 'Interpreter path')"
                      />
                    </template>
                  </v-tooltip>
                </div>
              </template>

              <template v-slot:no-data>
                <div class="pa-6 text-center text-body-2 text-medium-emphasis">
                  No Node.js versions installed through nvm yet.
                </div>
              </template>
            </v-data-table>

            <v-divider class="card-divider" />
            <v-card-text class="pa-4">
              <div class="field-hint">
                Paste the flag into a PM2 start command to pin an app to that runtime, e.g.
                <code>pm2 start app.js --name my-app {{ exampleFlag }}</code>
              </div>
            </v-card-text>
          </v-card>

        </template>
      </template>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const { showAlert } = useAlert()

const loading = ref(false)
const installing = ref(false)
const loadingAvailable = ref(false)
const versionToInstall = ref('')
const installOutput = ref('')
const available = ref([])

const info = ref({
  installed: false,
  nvmVersion: null,
  root: '',
  current: null,
  versions: [],
  isWindows: false,
  error: null
})

const headers = [
  { title: 'Version', key: 'version', width: '180px' },
  { title: 'Interpreter Path', key: 'interpreter' },
  { title: '', key: 'actions', sortable: false, width: '240px', align: 'end' }
]

const availableItems = computed(() =>
  available.value.map(v => (v.lts ? `${v.version} (LTS)` : v.version))
)

// The combobox accepts free text and the picker adds an "(LTS)" suffix — both end
// up here, so pull the plain x.y.z out before anything is sent or enabled
const parsedVersion = computed(() => {
  const match = String(versionToInstall.value || '').trim().match(/^v?(\d+\.\d+\.\d+)/)
  return match ? match[1] : ''
})

// Quote only when needed — a bare path reads better in a command line
const quotePath = (p) => (/\s/.test(p) ? `"${p}"` : p)
const interpreterFlag = (item) => `--interpreter ${quotePath(item.interpreter)}`

const exampleFlag = computed(() => {
  const sample = info.value.versions.find(v => v.current) || info.value.versions[0]
  return sample ? interpreterFlag(sample) : '--interpreter /path/to/node'
})

const loadInfo = async () => {
  loading.value = true
  try {
    const res = await api.getNvmInfo()
    if (res.data.success) info.value = res.data.data
  } catch {
    showAlert('Failed to load nvm information', 'error')
  } finally {
    loading.value = false
  }
}

const loadAvailable = async () => {
  loadingAvailable.value = true
  try {
    const res = await api.getNvmAvailableVersions()
    if (res.data.success) available.value = res.data.data.versions || []
  } catch (err) {
    showAlert(err.response?.data?.error || 'Failed to load the available versions', 'error')
  } finally {
    loadingAvailable.value = false
  }
}

const install = async () => {
  const version = parsedVersion.value
  if (!version) {
    showAlert('Enter a version as x.y.z', 'warning')
    return
  }
  installing.value = true
  installOutput.value = ''
  try {
    const res = await api.installNodeVersion(version)
    installOutput.value = res.data.data?.output || ''
    showAlert(`Node.js ${version} installed`, 'success')
    versionToInstall.value = ''
    await loadInfo()
  } catch (err) {
    const message = err.response?.data?.error || 'Failed to install the Node.js version'
    installOutput.value = message
    showAlert(message, 'error')
  } finally {
    installing.value = false
  }
}

// navigator.clipboard exists only in a secure context, and this admin is commonly
// served over plain http on a LAN — fall back to the legacy copy path there
const copy = async (text, label) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      if (!ok) throw new Error('copy rejected')
    }
    showAlert(`${label} copied`, 'success')
  } catch {
    showAlert('Could not copy to the clipboard', 'error')
  }
}

onMounted(loadInfo)
</script>

<style scoped>
.field-label { font-size:.78rem; font-weight:600; color:#94a3b8; }
.field-hint { font-size:.72rem; color:#475569; margin-top:4px; line-height:1.5; }
.field-hint code, .inline-code {
  background:rgba(255,255,255,.06); border-radius:3px; padding:0 4px;
  font-size:.72rem; color:#a5b4fc;
}
.link { color:#a5b4fc; text-decoration:none; }
.link:hover { text-decoration:underline; }
.cmd-box {
  display:flex; align-items:center; background:rgba(255,255,255,.04);
  border:1px solid rgba(99,102,241,.25); border-radius:8px; padding:10px 14px;
}
.cmd { font-family:'Courier New', monospace; font-size:.8rem; color:#a5b4fc; word-break:break-all; }
.interpreter-path {
  font-family:'Courier New', monospace; font-size:.78rem; color:#cbd5e1;
  background:rgba(255,255,255,.04); border-radius:4px; padding:2px 6px; word-break:break-all;
}
.root-path { font-family:'Courier New', monospace; font-size:.72rem; color:#475569; }
.output-box {
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:8px;
  padding:12px 14px; font-family:'Courier New', monospace; font-size:.75rem; color:#cbd5e1;
  white-space:pre-wrap; word-break:break-word; max-height:260px; overflow:auto;
}
.action-btns { display:flex; gap:6px; justify-content:flex-end; align-items:center; }
</style>
