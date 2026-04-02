<template>
  <MainAppBar title="Server Monitor" icon="mdi-chart-line" :titleIconSize="20" @refresh="fetchAll" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Charts -->
      <v-row class="mb-4" dense>
        <v-col cols="12" md="6">
          <v-card class="page-card fade-in" elevation="0" style="animation-delay:.04s">
            <div class="card-header">
              <span class="card-title">
                <v-icon size="15" color="info">mdi-cpu-64-bit</v-icon>
                CPU Usage
              </span>
              <v-spacer />
              <v-chip size="small" :color="cpuChipColor" variant="tonal">{{ currentCPU }}%</v-chip>
            </div>
            <v-divider class="card-divider" />
            <v-card-text class="pa-4">
              <div class="chart-wrap">
                <Line :data="cpuChartData" :options="chartOptions" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="page-card fade-in" elevation="0" style="animation-delay:.08s">
            <div class="card-header">
              <span class="card-title">
                <v-icon size="15" color="success">mdi-memory</v-icon>
                RAM Usage
              </span>
              <v-spacer />
              <v-chip size="small" :color="ramChipColor" variant="tonal">{{ currentRAM }}%</v-chip>
            </div>
            <v-divider class="card-divider" />
            <v-card-text class="pa-4">
              <div class="chart-wrap">
                <Line :data="ramChartData" :options="chartOptions" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Processes -->
      <v-card class="page-card fade-in mb-4" elevation="0" style="animation-delay:.12s">
        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="primary">mdi-format-list-numbered</v-icon>
            Top 100 Processes
          </span>
          <v-spacer />
          <v-text-field
            v-model="processSearch"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search..."
            single-line hide-details variant="outlined" density="compact"
            class="search-field" style="max-width:220px"
          />
        </div>
        <v-divider class="card-divider" />
        <v-data-table
          :headers="processHeaders" :items="processes" :search="processSearch"
          :items-per-page="20" class="data-table" hover density="comfortable"
        >
          <template v-slot:item.cpu="{ item }">
            <v-chip :color="cpuColor(item.cpu)" size="small" variant="flat" class="font-weight-medium">{{ item.cpu }}%</v-chip>
          </template>
          <template v-slot:item.memory="{ item }">
            <span class="font-weight-medium">{{ formatBytes(item.memory) }}</span>
          </template>
          <template v-slot:item.memoryPercent="{ item }">
            <div class="d-flex align-center gap-2">
              <v-progress-linear :model-value="item.memoryPercent" :color="memColor(item.memoryPercent)" height="4" rounded style="min-width:60px" />
              <span class="text-caption" style="min-width:36px">{{ item.memoryPercent }}%</span>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Shared Folders -->
      <v-card class="page-card fade-in" elevation="0" style="animation-delay:.16s">
        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="info">mdi-folder-network-outline</v-icon>
            Shared Folders
          </span>
        </div>
        <v-divider class="card-divider" />
        <v-data-table
          :headers="shareHeaders" :items="sharedFolders" :items-per-page="10"
          class="data-table" hover density="comfortable"
        >
          <template v-slot:no-data>
            <div class="empty-state">
              <v-icon size="36" color="grey">mdi-folder-off-outline</v-icon>
              <p class="mt-2 text-body-2 text-medium-emphasis">No shared folders found</p>
            </div>
          </template>
        </v-data-table>
      </v-card>

    </v-container>
  </v-main>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const processSearch = ref('')
const currentCPU = ref(0)
const currentRAM = ref(0)
const cpuData = shallowRef([])
const ramData = shallowRef([])
const timeLabels = shallowRef([])
const processes = shallowRef([])
const sharedFolders = shallowRef([])
let refreshInterval = null
const MAX_PTS = 180

const processHeaders = [
  { title: 'PID', key: 'pid', width: '80px' },
  { title: 'Name', key: 'name' },
  { title: 'CPU %', key: 'cpu', width: '100px' },
  { title: 'Memory', key: 'memory', width: '110px' },
  { title: 'Memory %', key: 'memoryPercent' }
]
const shareHeaders = [
  { title: 'Share Name', key: 'shareName' },
  { title: 'Path', key: 'path' },
  { title: 'Remark', key: 'remark' }
]

const cpuChipColor = computed(() => currentCPU.value >= 80 ? 'error' : currentCPU.value >= 50 ? 'warning' : 'info')
const ramChipColor = computed(() => currentRAM.value >= 80 ? 'error' : currentRAM.value >= 60 ? 'warning' : 'success')

const cpuChartData = computed(() => ({
  labels: timeLabels.value,
  datasets: [{ label: 'CPU %', data: cpuData.value, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 }]
}))
const ramChartData = computed(() => ({
  labels: timeLabels.value,
  datasets: [{ label: 'RAM %', data: ramData.value, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 }]
}))

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 10 } } }
  }
}

const fetchMonitor = async () => {
  try {
    const res = await api.getSystemMonitor()
    if (res.data.success) {
      const d = res.data.data
      currentCPU.value = +d.cpu.usage.toFixed(1)
      currentRAM.value = +d.memory.percent.toFixed(1)
      const t = new Date().toLocaleTimeString()
      const tl = [...timeLabels.value, t]
      const cd = [...cpuData.value, d.cpu.usage]
      const rd = [...ramData.value, d.memory.percent]
      timeLabels.value = tl.length > MAX_PTS ? tl.slice(-MAX_PTS) : tl
      cpuData.value    = cd.length > MAX_PTS ? cd.slice(-MAX_PTS) : cd
      ramData.value    = rd.length > MAX_PTS ? rd.slice(-MAX_PTS) : rd
    }
  } catch {}
}

const fetchProcesses = async () => {
  try {
    const res = await api.getTopProcesses()
    if (res.data.success) processes.value = res.data.data.processes
  } catch {}
}

const fetchSharedFolders = async () => {
  try {
    const res = await api.getSharedFolders()
    if (res.data.success) sharedFolders.value = res.data.data.sharedFolders || []
  } catch {}
}

const fetchAll = () => { fetchMonitor(); fetchProcesses(); fetchSharedFolders() }

const formatBytes = (bytes) => {
  bytes = Number(bytes)
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024, sizes = ['B','KB','MB','GB','TB']
  const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const cpuColor = (v) => v >= 80 ? 'error' : v >= 50 ? 'warning' : 'success'
const memColor = (v) => v >= 80 ? 'error' : v >= 60 ? 'warning' : 'success'

onMounted(() => {
  fetchAll()
  refreshInterval = setInterval(fetchAll, 10000)
})
onUnmounted(() => { if (refreshInterval) clearInterval(refreshInterval) })
</script>

<style scoped>
.chart-wrap { height: 260px; }
.empty-state { display:flex; flex-direction:column; align-items:center; padding:32px; }
</style>
