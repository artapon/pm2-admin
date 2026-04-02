<template>
  <MainAppBar title="Plugins" icon="mdi-puzzle-outline" :titleIconSize="20" @refresh="loadPlugins" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <v-card class="page-card fade-in" elevation="0" :loading="loading">
        <template v-slot:loader="{ isActive }">
          <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
        </template>

        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="primary">mdi-puzzle-outline</v-icon>
            PM2 Plugins
            <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ plugins.length }}</v-chip>
          </span>
        </div>
        <v-divider class="card-divider" />

        <v-data-table
          :headers="headers"
          :items="plugins"
          :loading="loading"
          class="data-table"
          hover
          density="comfortable"
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
              <v-btn size="small" color="warning" variant="tonal" prepend-icon="mdi-restart" class="action-btn" @click="openRestart(item.name)">Restart</v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>

    </v-container>
  </v-main>

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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const authStore = useAuthStore()
const { showAlert } = useAlert()

const allApps = ref([])
const loading = ref(false)
const restartDialog = ref(false)
const appToRestart = ref('')

const plugins = computed(() => allApps.value.filter(a => a.name.startsWith('pm2-')))

const headers = computed(() => {
  const base = [
    { title: 'Name', key: 'name', minWidth: '160px' },
    { title: 'Status', key: 'status', width: '120px' },
    { title: 'CPU', key: 'cpu', width: '90px' },
    { title: 'Memory', key: 'memory', width: '110px' },
    { title: 'Restarts', key: 'restarts', width: '100px' },
    { title: 'Uptime', key: 'uptime' },
  ]
  if (authStore.role === 'root') base.push({ title: '', key: 'actions', sortable: false, width: '120px', align: 'end' })
  return base
})

const loadPlugins = async () => {
  loading.value = true
  try {
    const res = await api.getAllApps()
    if (res.data.success) allApps.value = res.data.data.apps || []
  } catch {
    showAlert('Failed to load plugins', 'error')
  } finally {
    loading.value = false
  }
}

const openRestart = (name) => { appToRestart.value = name; restartDialog.value = true }
const handleRestart = async () => {
  try {
    await api.restartApp(appToRestart.value)
    showAlert('Plugin restarted', 'success')
    restartDialog.value = false
    loadPlugins()
  } catch {
    showAlert('Failed to restart', 'error')
    restartDialog.value = false
  }
}

const statusColor = (s) => ({ online: 'success', stopped: 'warning', errored: 'error' }[s] || 'grey')
const statusIcon  = (s) => ({ online: 'mdi-check-circle', stopped: 'mdi-stop-circle', errored: 'mdi-alert-circle' }[s] || 'mdi-help-circle')

onMounted(loadPlugins)
</script>

<style scoped>
.app-link { color:#fff!important; text-decoration:none; font-weight:600; transition:color .15s; }
.app-link:hover { color:#a5b4fc!important; }
.status-chip { font-size:.67rem!important; }
.action-btns { display:flex; gap:4px; justify-content:flex-end; }
</style>
