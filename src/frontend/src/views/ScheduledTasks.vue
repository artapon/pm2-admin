<template>
  <MainAppBar 
    title="Scheduled Tasks" 
    icon="mdi-calendar-clock" 
    :titleIconSize="24" 
    showBack 
    @refresh="loadScheduledTasks" 
  />

  <v-main class="main-content">
    <v-container fluid class="pa-6">
      <!-- Scheduled Tasks Table -->
      <v-row>
        <v-col cols="12">
          <v-card class="tasks-card glass-card" elevation="0">
            <v-card-title class="pa-4">
              <v-icon class="mr-2" color="primary">mdi-calendar-clock</v-icon>
              <span class="text-h6 font-weight-bold">Windows Scheduled Tasks</span>
              <v-spacer></v-spacer>
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Search tasks..."
                single-line
                hide-details
                variant="outlined"
                density="compact"
                style="max-width: 300px;"
              ></v-text-field>
            </v-card-title>
            <v-divider></v-divider>
            <v-data-table
              :headers="headers"
              :items="scheduledTasks"
              :search="search"
              :loading="loading"
              :items-per-page="20"
              class="modern-table"
              hover
            >
              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  size="small"
                  variant="flat"
                >
                  {{ item.status }}
                </v-chip>
              </template>
              <template v-slot:item.taskName="{ item }">
                <span class="font-weight-medium">{{ item.taskName }}</span>
              </template>
              <template v-slot:no-data>
                <div class="text-center pa-4">
                  <v-icon size="48" color="grey">mdi-calendar-remove</v-icon>
                  <p class="text-body-1 mt-2">No scheduled tasks found</p>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const router = useRouter()
const scheduledTasks = ref([])
const loading = ref(false)
const search = ref('')

const headers = [
  { title: 'Task Name', key: 'taskName' },
  { title: 'Status', key: 'status' },
  { title: 'Next Run Time', key: 'nextRunTime' },
  { title: 'Last Run Time', key: 'lastRunTime' },
  { title: 'Last Result', key: 'lastResult' },
  { title: 'Author', key: 'author' }
]

const loadScheduledTasks = async () => {
  loading.value = true
  try {
    const response = await api.getScheduledTasks()
    if (response.data.success) {
      scheduledTasks.value = response.data.data.scheduledTasks || []
    }
  } catch (error) {
    console.error('Failed to load scheduled tasks:', error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/apps')
}

const getStatusColor = (status) => {
  if (!status) return 'grey'
  const statusLower = status.toLowerCase()
  if (statusLower.includes('ready') || statusLower.includes('running')) return 'success'
  if (statusLower.includes('disabled')) return 'grey'
  return 'warning'
}

onMounted(() => {
  loadScheduledTasks()
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

.tasks-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
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
