<template>
  <MainAppBar title="Scheduled Tasks" icon="mdi-calendar-clock-outline" :titleIconSize="20" @refresh="loadScheduledTasks" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">
      <v-card class="page-card fade-in" elevation="0">

        <!-- Card header -->
        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="primary">mdi-calendar-clock-outline</v-icon>
            Scheduled Tasks
            <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ filtered.length }}</v-chip>
          </span>
          <v-spacer />
          <v-btn
            :color="showAdvanced ? 'primary' : 'default'"
            :variant="showAdvanced ? 'tonal' : 'outlined'"
            size="small"
            prepend-icon="mdi-tune"
            class="mr-2 filter-btn"
            @click="showAdvanced = !showAdvanced"
          >
            Filters
            <v-badge v-if="activeFilterCount" :content="activeFilterCount" color="primary" floating inline class="ml-1" />
          </v-btn>
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search..."
            single-line hide-details variant="outlined" density="compact"
            class="search-field" style="max-width:220px"
            clearable
          />
        </div>

        <!-- Advanced search panel -->
        <v-expand-transition>
          <div v-if="showAdvanced" class="advanced-panel">
            <v-divider class="card-divider" />
            <div class="advanced-inner">
              <v-row dense align="center">
                <v-col cols="12" sm="4" md="3">
                  <div class="filter-label">Status</div>
                  <v-select
                    v-model="filters.status"
                    :items="statusOptions"
                    placeholder="All statuses"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    class="filter-field"
                  />
                </v-col>
                <v-col cols="12" sm="4" md="3">
                  <div class="filter-label">Author</div>
                  <v-select
                    v-model="filters.author"
                    :items="authorOptions"
                    placeholder="All authors"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    class="filter-field"
                  />
                </v-col>
                <v-col cols="12" sm="4" md="3">
                  <div class="filter-label">Last Result</div>
                  <v-select
                    v-model="filters.lastResult"
                    :items="lastResultOptions"
                    placeholder="All results"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    class="filter-field"
                  />
                </v-col>
                <v-col cols="12" md="3" class="d-flex align-end">
                  <v-btn
                    variant="text"
                    class="btn-cancel mt-4"
                    prepend-icon="mdi-filter-off-outline"
                    :disabled="!activeFilterCount"
                    @click="clearFilters"
                  >
                    Clear Filters
                  </v-btn>
                </v-col>
              </v-row>
            </div>
          </div>
        </v-expand-transition>

        <v-divider class="card-divider" />

        <v-data-table
          :headers="headers"
          :items="filtered"
          :loading="loading"
          :items-per-page="25"
          class="data-table"
          hover
          density="comfortable"
        >
          <template v-slot:item.status="{ item }">
            <v-chip :color="statusColor(item.status)" size="small" variant="tonal" class="font-weight-medium">
              <v-icon start size="12">{{ statusIcon(item.status) }}</v-icon>
              {{ item.status }}
            </v-chip>
          </template>
          <template v-slot:item.taskName="{ item }">
            <span class="font-weight-medium">{{ item.taskName }}</span>
          </template>
          <template v-slot:item.lastResult="{ item }">
            <v-chip v-if="item.lastResult" :color="resultColor(item.lastResult)" size="x-small" variant="tonal">
              {{ item.lastResult }}
            </v-chip>
            <span v-else class="text-secondary">—</span>
          </template>
          <template v-slot:item.nextRunTime="{ item }">
            <span class="text-caption">{{ item.nextRunTime || '—' }}</span>
          </template>
          <template v-slot:item.lastRunTime="{ item }">
            <span class="text-caption">{{ item.lastRunTime || '—' }}</span>
          </template>
          <template v-slot:no-data>
            <div class="empty-state">
              <v-icon size="36" color="grey">mdi-calendar-remove-outline</v-icon>
              <p class="mt-2 text-body-2 text-medium-emphasis">No scheduled tasks found</p>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const scheduledTasks = ref([])
const loading = ref(false)
const search = ref('')
const showAdvanced = ref(false)

const filters = ref({
  status: null,
  author: null,
  lastResult: null
})

const headers = [
  { title: 'Task Name', key: 'taskName' },
  { title: 'Status', key: 'status', width: '140px' },
  { title: 'Next Run', key: 'nextRunTime', width: '160px' },
  { title: 'Last Run', key: 'lastRunTime', width: '160px' },
  { title: 'Last Result', key: 'lastResult', width: '130px' },
  { title: 'Author', key: 'author', width: '130px' }
]

const loadScheduledTasks = async () => {
  loading.value = true
  try {
    const res = await api.getScheduledTasks()
    if (res.data.success) scheduledTasks.value = res.data.data.scheduledTasks || []
  } catch {}
  finally { loading.value = false }
}

// Dynamic filter options derived from data
const statusOptions = computed(() => [...new Set(scheduledTasks.value.map(t => t.status).filter(Boolean))])
const authorOptions = computed(() => [...new Set(scheduledTasks.value.map(t => t.author).filter(Boolean))])
const lastResultOptions = computed(() => [...new Set(scheduledTasks.value.map(t => t.lastResult).filter(Boolean))])

const activeFilterCount = computed(() =>
  Object.values(filters.value).filter(v => v !== null && v !== '').length
)

const filtered = computed(() => {
  let list = scheduledTasks.value

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(t =>
      t.taskName?.toLowerCase().includes(q) ||
      t.author?.toLowerCase().includes(q) ||
      t.status?.toLowerCase().includes(q)
    )
  }
  if (filters.value.status)     list = list.filter(t => t.status === filters.value.status)
  if (filters.value.author)     list = list.filter(t => t.author === filters.value.author)
  if (filters.value.lastResult) list = list.filter(t => t.lastResult === filters.value.lastResult)

  return list
})

const clearFilters = () => {
  filters.value = { status: null, author: null, lastResult: null }
}

const statusColor = (s) => {
  if (!s) return 'grey'
  const l = s.toLowerCase()
  if (l.includes('ready') || l.includes('running')) return 'success'
  if (l.includes('disabled')) return 'grey'
  return 'warning'
}

const statusIcon = (s) => {
  if (!s) return 'mdi-help-circle-outline'
  const l = s.toLowerCase()
  if (l.includes('running')) return 'mdi-play-circle-outline'
  if (l.includes('ready'))   return 'mdi-check-circle-outline'
  if (l.includes('disabled')) return 'mdi-pause-circle-outline'
  return 'mdi-clock-outline'
}

const resultColor = (r) => {
  if (!r) return 'grey'
  const l = r.toLowerCase()
  if (l.includes('success') || l === '0') return 'success'
  if (l.includes('fail') || l.includes('error')) return 'error'
  return 'warning'
}

import { onMounted } from 'vue'
onMounted(loadScheduledTasks)
</script>

<style scoped>
.filter-btn { text-transform: none; letter-spacing: 0; font-weight: 500; }
.filter-label { font-size: 0.75rem; font-weight: 500; color: #64748b; margin-bottom: 4px; }
.filter-field { font-size: 0.85rem; }
.advanced-panel { background: rgba(255,255,255,0.02); }
.advanced-inner { padding: 14px 16px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 32px; }
.text-secondary { color: #64748b; }
</style>
