<template>
  <MainAppBar 
    title="Listening Ports" 
    icon="mdi-lan" 
    :titleIconSize="24" 
    showBack 
    @refresh="loadPorts" 
  />

  <v-main class="main-content">
    <v-container fluid class="pa-6">
      <v-row>
        <v-col cols="12">
          <v-card class="ports-card glass-card fade-in" elevation="0">
            <v-card-title class="pa-5 d-flex align-center">
              <span class="text-h6 font-weight-bold">Listening Ports</span>
              <v-spacer></v-spacer>
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Search ports..."
                single-line
                hide-details
                variant="outlined"
                density="compact"
                class="search-field"
                style="max-width: 300px;"
              ></v-text-field>
            </v-card-title>
            <v-data-table
              :headers="headers"
              :items="ports"
              :search="search"
              :loading="loading"
              class="modern-table"
              hover
            >
              <template v-slot:item.serviceName="{ item }">
                <div v-if="item.isPM2Service">
                  <router-link v-if="item.status === 'online'" :to="`/apps/${item.appName}`" class="app-link">
                    {{ item.appName }}
                  </router-link>
                  <span v-else>{{ item.appName }}</span>
                  <v-chip
                    :color="item.status === 'online' ? 'success' : 'error'"
                    variant="flat"
                    size="x-small"
                    class="ml-2"
                  >
                    {{ item.status }}
                  </v-chip>
                </div>
                <span v-else>{{ item.appName || '-' }}</span>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const router = useRouter()
const ports = ref([])
const loading = ref(false)
const search = ref('')

const headers = [
  { title: 'Protocol', key: 'protocol' },
  { title: 'Service Name', key: 'serviceName' },
  { title: 'Port', key: 'localPort' }
]

const loadPorts = async () => {
  loading.value = true
  try {
    const response = await api.getListeningPorts()
    if (response.data.success) {
      ports.value = response.data.data.listPorts || []
    }
  } catch (error) {
    console.error('Failed to load ports:', error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/apps')
}

onMounted(() => {
  loadPorts()
})
</script>

<style scoped>
.main-content {
  background: #0d0d14;
  min-height: 100vh;
}

.ports-card {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
}

.modern-table :deep(thead tr) {
  background: rgba(255, 255, 255, 0.025);
}

.modern-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.7rem !important;
  letter-spacing: 0.06em;
  color: #64748b !important;
}

.modern-table :deep(tbody tr:hover td) {
  background-color: rgba(99, 102, 241, 0.05) !important;
}

.app-link {
  color: #818cf8;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s ease;
}

.app-link:hover {
  color: #a5b4fc;
  text-decoration: underline;
}

.search-field :deep(.v-field) {
  transition: border-color 0.2s ease;
}

.search-field :deep(.v-field:hover) {
  border-color: rgba(99, 102, 241, 0.4);
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
