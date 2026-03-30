<template>
  <MainAppBar 
    title="Server Monitor" 
    icon="mdi-chart-line" 
    :titleIconSize="24" 
    showBack 
    @refresh="fetchMonitorData" 
  />

  <v-main class="main-content">
    <v-container fluid class="pa-6">
      <!-- CPU and RAM Charts -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-card class="chart-card glass-card" elevation="0">
            <v-card-title class="pa-4">
              <v-icon class="mr-2" color="primary">mdi-cpu-64-bit</v-icon>
              <span class="text-h6 font-weight-bold">CPU Usage</span>
              <v-spacer></v-spacer>
              <v-chip color="primary" size="small">{{ currentCPU }}%</v-chip>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-4">
              <Line :data="cpuChartData" :options="chartOptions" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="chart-card glass-card" elevation="0">
            <v-card-title class="pa-4">
              <v-icon class="mr-2" color="success">mdi-memory</v-icon>
              <span class="text-h6 font-weight-bold">RAM Usage</span>
              <v-spacer></v-spacer>
              <v-chip color="success" size="small">{{ currentRAM }}%</v-chip>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-4">
              <Line :data="ramChartData" :options="chartOptions" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Top Processes Table -->
      <v-row>
        <v-col cols="12">
          <v-card class="processes-card glass-card" elevation="0">
            <v-card-title class="pa-4">
              <v-icon class="mr-2" color="error">mdi-format-list-numbered</v-icon>
              <span class="text-h6 font-weight-bold">Top 100 Processes</span>
              <v-spacer></v-spacer>
              <v-text-field
                v-model="processSearch"
                prepend-inner-icon="mdi-magnify"
                label="Search processes..."
                single-line
                hide-details
                variant="outlined"
                density="compact"
                style="max-width: 300px;"
              ></v-text-field>
            </v-card-title>
            <v-divider></v-divider>
            <v-data-table
              :headers="processHeaders"
              :items="processes"
              :search="processSearch"
              :items-per-page="20"
              class="modern-table"
              hover
            >
              <template v-slot:item.cpu="{ item }">
                <v-chip :color="getCPUColor(item.cpu)" size="small" variant="flat">
                  {{ item.cpu }}%
                </v-chip>
              </template>
              <template v-slot:item.memory="{ item }">
                <span class="font-weight-medium">{{ formatBytes(item.memory) }}</span>
              </template>
              <template v-slot:item.memoryPercent="{ item }">
                <v-progress-linear
                  :model-value="item.memoryPercent"
                  :color="getMemoryColor(item.memoryPercent)"
                  height="6"
                  rounded
                ></v-progress-linear>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>

      <!-- Shared Folders Table -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-card class="shares-card glass-card" elevation="0">
            <v-card-title class="pa-4">
              <v-icon class="mr-2" color="info">mdi-folder-network</v-icon>
              <span class="text-h6 font-weight-bold">Shared Folders</span>
            </v-card-title>
            <v-divider></v-divider>
            <v-data-table
              :headers="shareHeaders"
              :items="sharedFolders"
              :items-per-page="10"
              class="modern-table"
              hover
            >
              <template v-slot:item.shareName="{ item }">
                <span class="font-weight-medium">{{ item.shareName }}</span>
              </template>
              <template v-slot:no-data>
                <div class="text-center pa-4">
                  <v-icon size="48" color="grey">mdi-folder-off</v-icon>
                  <p class="text-body-1 mt-2">No shared folders found</p>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Footer -->
    <v-footer class="footer-gradient text-center pa-4 mt-8">
      <div class="w-100">
        <div class="text-body-2">
          PM2 Services Monitor © {{ new Date().getFullYear() }}
        </div>
      </div>
    </v-footer>
  </v-main>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const router = useRouter()
const autoRefresh = ref(true)
const processSearch = ref('')

// Current values
const currentCPU = ref(0)
const currentRAM = ref(0)

// Chart data
const cpuData = ref([])
const ramData = ref([])
const timeLabels = ref([])
const processes = ref([])

let refreshInterval = null
const MAX_DATA_POINTS = 180 // 30 minutes at 10s intervals

const processHeaders = [
  { title: 'PID', key: 'pid' },
  { title: 'Name', key: 'name' },
  { title: 'CPU %', key: 'cpu' },
  { title: 'Memory', key: 'memory' },
  { title: 'Memory %', key: 'memoryPercent' }
]

const shareHeaders = [
  { title: 'Share Name', key: 'shareName' },
  { title: 'Path', key: 'path' }
]

const sharedFolders = ref([])

const cpuChartData = computed(() => ({
  labels: timeLabels.value,
  datasets: [{
    label: 'CPU Usage (%)',
    data: cpuData.value,
    borderColor: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 0,
    borderWidth: 2
  }]
}))

const ramChartData = computed(() => ({
  labels: timeLabels.value,
  datasets: [{
    label: 'RAM Usage (%)',
    data: ramData.value,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 0,
    borderWidth: 2
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        color: '#94a3b8'
      }
    },
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: '#94a3b8',
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 10
      }
    }
  }
}

const fetchMonitorData = async () => {
  try {
    const response = await api.getSystemMonitor()
    if (response.data.success) {
      const data = response.data.data
      
      // Update current values
      currentCPU.value = data.cpu.usage.toFixed(1)
      currentRAM.value = data.memory.percent.toFixed(1)
      
      // Create new arrays instead of mutating (prevents Vue reactivity issues)
      const time = new Date().toLocaleTimeString()
      const newTimeLabels = [...timeLabels.value, time]
      const newCpuData = [...cpuData.value, data.cpu.usage]
      const newRamData = [...ramData.value, data.memory.percent]
      
      // Keep only last 180 data points (30 minutes)
      if (newTimeLabels.length > MAX_DATA_POINTS) {
        timeLabels.value = newTimeLabels.slice(-MAX_DATA_POINTS)
        cpuData.value = newCpuData.slice(-MAX_DATA_POINTS)
        ramData.value = newRamData.slice(-MAX_DATA_POINTS)
      } else {
        timeLabels.value = newTimeLabels
        cpuData.value = newCpuData
        ramData.value = newRamData
      }
    }
  } catch (error) {
    console.error('Failed to fetch monitor data:', error)
  }
}

const fetchProcesses = async () => {
  try {
    const response = await api.getTopProcesses()
    if (response.data.success) {
      processes.value = response.data.data.processes
    }
  } catch (error) {
    console.error('Failed to fetch processes:', error)
  }
}

const fetchSharedFolders = async () => {
  try {
    const response = await api.getSharedFolders()
    if (response.data.success) {
      sharedFolders.value = response.data.data.sharedFolders || []
    }
  } catch (error) {
    console.error('Failed to fetch shared folders:', error)
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  refreshInterval = setInterval(() => {
    fetchMonitorData()
    fetchProcesses()
    fetchSharedFolders()
  }, 10000) // 10 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

const goBack = () => {
  router.push('/apps')
}

function formatBytes(bytes, decimals = 2) {
    bytes = Number(bytes);

    if (!bytes || bytes <= 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    // Prevent negative index (size below 1 byte)
    if (bytes < 1) return `${bytes.toFixed(dm)} Bytes`;

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const getCPUColor = (cpu) => {
  if (cpu >= 80) return 'error'
  if (cpu >= 50) return 'warning'
  return 'success'
}

const getMemoryColor = (percent) => {
  if (percent >= 80) return 'error'
  if (percent >= 60) return 'warning'
  return 'success'
}

onMounted(() => {
  fetchMonitorData()
  fetchProcesses()
  fetchSharedFolders()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.app-bar-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
}

.main-content {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
}

.chart-card, .processes-card, .shares-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 100%;
}

.chart-card :deep(canvas) {
  height: 300px !important;
}

.modern-table :deep(thead) {
  background-color: rgba(51, 65, 85, 0.5);
}

.modern-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: #94a3b8 !important;
}

.modern-table :deep(tbody tr:hover) {
  background-color: rgba(51, 65, 85, 0.3) !important;
}

.footer-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white;
}

.footer-link {
  color: white;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s ease;
}

.footer-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}
</style>
