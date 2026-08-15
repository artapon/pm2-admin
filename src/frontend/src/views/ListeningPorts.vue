<template>
  <MainAppBar title="Listening Ports" icon="mdi-lan" :titleIconSize="20" @refresh="loadPorts" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">
      <v-card class="page-card fade-in" elevation="0">
        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="primary">mdi-lan</v-icon>
            Listening Ports
            <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ ports.length }}</v-chip>
          </span>
          <v-spacer />
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search..."
            single-line hide-details variant="outlined" density="compact"
            class="search-field" style="max-width:220px"
          />
        </div>
        <v-divider class="card-divider" />
        <v-data-table
          :headers="headers" :items="ports" :search="search" :loading="loading"
          class="data-table" hover density="comfortable"
        >
          <template v-slot:item.protocol="{ item }">
            <v-chip size="x-small" variant="tonal" color="info" class="font-weight-medium">{{ item.protocol }}</v-chip>
          </template>
          <template v-slot:item.serviceName="{ item }">
            <div v-if="item.isPM2Service" class="d-flex align-center gap-2">
              <router-link :to="{ name: 'AppDetail', params: { appName: item.appName } }" class="app-link font-weight-medium">{{ item.appName }}</router-link>
              <v-chip :color="statusColor(item.status)" variant="tonal" size="x-small">{{ item.status }}</v-chip>
            </div>
            <span v-else class="text-secondary">{{ item.appName || '-' }}</span>
          </template>
          <template v-slot:item.localPort="{ item }">
            <span class="font-weight-semibold font-mono" :class="{ 'text-secondary': !item.listening }">{{ item.localPort }}</span>
          </template>
          <template v-slot:item.listening="{ item }">
            <v-chip v-if="item.listening" size="x-small" variant="tonal" color="success">
              <v-icon size="12" start>mdi-check-circle-outline</v-icon>Listening
            </v-chip>
            <v-chip v-else size="x-small" variant="tonal" color="grey">
              <v-icon size="12" start>mdi-close-circle-outline</v-icon>Not listening
            </v-chip>
          </template>
        </v-data-table>
      </v-card>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const ports = ref([])
const loading = ref(false)
const search = ref('')

const headers = [
  { title: 'Protocol', key: 'protocol', width: '110px' },
  { title: 'Port', key: 'localPort', width: '100px' },
  { title: 'Bound', key: 'listening', width: '140px', sortable: false },
  { title: 'Service / Application', key: 'serviceName' }
]

const statusColor = (s) => ({ online: 'success', stopped: 'warning', errored: 'error' }[s] || 'grey')

const loadPorts = async () => {
  loading.value = true
  try {
    const res = await api.getListeningPorts()
    if (res.data.success) ports.value = (res.data.data.listPorts || []).filter(p => p.isPM2Service)
  } catch {}
  finally { loading.value = false }
}

onMounted(loadPorts)
</script>

<style scoped>
.app-link { color:#a5b4fc!important; text-decoration:none; transition:color .15s; }
.app-link:hover { color:#c7d2fe!important; text-decoration:underline; }
.font-mono { font-family: 'Courier New', monospace; }
.text-secondary { color:#94a3b8; }
</style>
