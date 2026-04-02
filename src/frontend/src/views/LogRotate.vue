<template>
  <MainAppBar title="Log Rotate" icon="mdi-rotate-right" :titleIconSize="20" @refresh="loadConfig" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Loading -->
      <div v-if="loading" class="d-flex flex-column align-center justify-center" style="min-height:360px">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
        <span class="text-body-2 text-medium-emphasis">Loading configuration...</span>
      </div>

      <template v-else>

        <!-- Not installed banner -->
        <v-card v-if="!installed" class="page-card fade-in mb-4" elevation="0">
          <div class="card-header">
            <v-icon size="16" color="warning">mdi-alert-circle-outline</v-icon>
            <span class="card-title">pm2-logrotate Not Installed</span>
          </div>
          <v-divider class="card-divider" />
          <v-card-text class="pa-4">
            <p class="text-body-2 text-medium-emphasis mb-3">
              pm2-logrotate is a PM2 module that automatically rotates log files to prevent them from growing indefinitely.
              Install it with the following command:
            </p>
            <div class="install-cmd-box">
              <v-icon size="14" color="primary" class="mr-2">mdi-console</v-icon>
              <code class="install-cmd">pm2 install pm2-logrotate</code>
            </div>
            <p class="text-caption text-medium-emphasis mt-3">
              After installation, refresh this page to configure log rotation settings.
            </p>
          </v-card-text>
        </v-card>

        <!-- Config form -->
        <v-card v-if="installed" class="page-card fade-in" elevation="0" :loading="saving">
          <template v-slot:loader="{ isActive }">
            <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
          </template>

          <div class="card-header">
            <span class="card-title">
              <v-icon size="15" color="primary">mdi-cog-outline</v-icon>
              pm2-logrotate Settings
            </span>
            <v-spacer />
            <v-chip color="success" size="small" variant="tonal">
              <v-icon start size="11">mdi-check-circle</v-icon>
              Installed
            </v-chip>
          </div>
          <v-divider class="card-divider" />

          <v-card-text class="pa-4">
            <v-row>

              <!-- max_size -->
              <v-col cols="12" md="6">
                <div class="field-label mb-1">Max Size</div>
                <v-text-field
                  v-model="form.max_size"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  placeholder="1G"
                />
                <div class="field-hint">File size that triggers rotation. Supports K, M, G (e.g. <code>10M</code>, <code>1G</code>)</div>
              </v-col>

              <!-- retain -->
              <v-col cols="12" md="6">
                <div class="field-label mb-1">Retain</div>
                <v-text-field
                  v-model="form.retain"
                  variant="outlined"
                  density="compact"
                  type="number"
                  hide-details="auto"
                  placeholder="3"
                  min="1"
                />
                <div class="field-hint">Number of rotated log files to keep before deleting old ones</div>
              </v-col>

              <!-- rotateInterval -->
              <v-col cols="12" md="6">
                <div class="field-label mb-1">Rotate Interval <span class="field-label-sub">(cron)</span></div>
                <v-text-field
                  v-model="form.rotateInterval"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  placeholder="0 0 1 * *"
                />
                <div class="field-hint">Force rotation on schedule regardless of file size. Default: <code>0 0 1 * *</code> (1st of every month)</div>
              </v-col>

              <!-- workerInterval -->
              <v-col cols="12" md="6">
                <div class="field-label mb-1">Worker Interval <span class="field-label-sub">(seconds)</span></div>
                <v-text-field
                  v-model="form.workerInterval"
                  variant="outlined"
                  density="compact"
                  type="number"
                  hide-details="auto"
                  placeholder="30"
                  min="1"
                />
                <div class="field-hint">How often to check log file sizes (minimum 1 second)</div>
              </v-col>

              <!-- dateFormat -->
              <v-col cols="12" md="6">
                <div class="field-label mb-1">Date Format</div>
                <v-text-field
                  v-model="form.dateFormat"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  placeholder="YYYY-MM-DD_HH-mm-ss"
                />
                <div class="field-hint">Format used to name rotated log files (moment.js pattern)</div>
              </v-col>

              <!-- TZ -->
              <v-col cols="12" md="6">
                <div class="field-label mb-1">Timezone <span class="field-label-sub">(TZ)</span></div>
                <v-text-field
                  v-model="form.TZ"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  placeholder="Asia/Bangkok"
                />
                <div class="field-hint">IANA timezone for log timestamps (e.g. <code>Asia/Bangkok</code>, <code>UTC</code>). Leave empty for system default</div>
              </v-col>

              <!-- compress -->
              <v-col cols="12" md="6">
                <div class="toggle-row">
                  <div>
                    <div class="field-label">Compress</div>
                    <div class="field-hint mt-1">Gzip compress rotated log files to save disk space</div>
                  </div>
                  <v-switch v-model="form.compress" color="primary" hide-details density="compact" inset />
                </div>
              </v-col>

              <!-- rotateModule -->
              <v-col cols="12" md="6">
                <div class="toggle-row">
                  <div>
                    <div class="field-label">Rotate Module Logs</div>
                    <div class="field-hint mt-1">Include PM2 module logs (e.g. pm2-logrotate itself) in rotation</div>
                  </div>
                  <v-switch v-model="form.rotateModule" color="primary" hide-details density="compact" inset />
                </div>
              </v-col>

            </v-row>
          </v-card-text>

          <v-divider class="card-divider" />
          <v-card-actions class="pa-4">
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              prepend-icon="mdi-content-save-outline"
              :loading="saving"
              @click="saveConfig"
            >
              Save Settings
            </v-btn>
          </v-card-actions>
        </v-card>

      </template>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const { showAlert } = useAlert()

const loading = ref(false)
const saving = ref(false)
const installed = ref(false)

const form = ref({
  max_size: '1G',
  retain: '3',
  compress: false,
  dateFormat: 'YYYY-MM-DD_HH-mm-ss',
  rotateModule: true,
  workerInterval: '30',
  rotateInterval: '0 0 1 * *',
  TZ: ''
})

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await api.getLogRotateConfig()
    if (res.data.success) {
      installed.value = res.data.data.installed
      const cfg = res.data.data.config
      form.value = {
        max_size: cfg.max_size ?? '10M',
        retain: String(cfg.retain ?? 30),
        compress: String(cfg.compress) === 'true',
        dateFormat: cfg.dateFormat ?? 'YYYY-MM-DD_HH-mm-ss',
        rotateModule: String(cfg.rotateModule) === 'true',
        workerInterval: String(cfg.workerInterval ?? 30),
        rotateInterval: cfg.rotateInterval ?? '0 0 * * *',
        TZ: cfg.TZ ?? ''
      }
    }
  } catch {
    showAlert('Failed to load configuration', 'error')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    const entries = [
      ['max_size',       form.value.max_size],
      ['retain',         form.value.retain],
      ['compress',       String(form.value.compress)],
      ['dateFormat',     form.value.dateFormat],
      ['rotateModule',   String(form.value.rotateModule)],
      ['workerInterval', form.value.workerInterval],
      ['rotateInterval', form.value.rotateInterval],
      ['TZ',             form.value.TZ],
    ]
    for (const [key, value] of entries) {
      await api.setLogRotateConfig(key, value)
    }
    showAlert('Settings saved successfully', 'success')
  } catch {
    showAlert('Failed to save settings', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(loadConfig)
</script>

<style scoped>
.field-label {
  font-size: .78rem;
  font-weight: 600;
  color: #94a3b8;
}
.field-label-sub {
  font-weight: 400;
  color: #475569;
}
.field-hint {
  font-size: .72rem;
  color: #475569;
  margin-top: 4px;
  line-height: 1.4;
}
.field-hint code {
  background: rgba(255,255,255,.06);
  border-radius: 3px;
  padding: 0 3px;
  font-size: .72rem;
  color: #a5b4fc;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 8px;
  padding: 12px 14px;
  height: 100%;
}
.install-cmd-box {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(99,102,241,.25);
  border-radius: 8px;
  padding: 10px 14px;
}
.install-cmd {
  font-family: 'Courier New', monospace;
  font-size: .85rem;
  color: #a5b4fc;
}
</style>
