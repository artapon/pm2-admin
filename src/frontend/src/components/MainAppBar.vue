<template>
  <v-app-bar class="app-bar-gradient" dark app elevation="0">
    <v-btn v-if="showBack" icon @click="goBack" class="mr-2">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-toolbar-title class="toolbar-title">
      <v-icon class="mr-2" :size="titleIconSize">{{ icon }}</v-icon>
      <span class="font-weight-bold">{{ title }}</span>
    </v-toolbar-title>
    <v-spacer></v-spacer>
    
    <v-btn icon @click="$emit('refresh')" class="mr-2">
      <v-icon>mdi-refresh</v-icon>
    </v-btn>
    
    <v-btn color="primary" variant="flat" @click="goToMonitor" class="mr-2 action-header-btn">
      <v-icon class="mr-1" size="20">mdi-chart-line</v-icon>
      Monitor
    </v-btn>
    
    <v-btn v-if="authStore.role === 'root'" color="success" variant="flat" @click="handlePM2Save" :loading="saving" class="mr-2 action-header-btn">
      <v-icon class="mr-1" size="20">mdi-content-save</v-icon>
      PM2 Save
    </v-btn>
    
    <v-btn v-if="authStore.role === 'root'" color="warning" variant="flat" @click="goToGitClone" class="mr-2 action-header-btn">
      <v-icon class="mr-1" size="20">mdi-git</v-icon>
      Git Clone
    </v-btn>
    
    <!-- Management Menu -->
    <v-menu transition="scale-transition">
      <template v-slot:activator="{ props }">
        <v-btn
          color="indigo-darken-2"
          variant="flat"
          v-bind="props"
          class="mr-2 action-header-btn"
        >
          <v-icon class="mr-2">mdi-cog-outline</v-icon>
          Management
          <v-icon size="16" class="ml-2">mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <v-list class="user-dropdown-list bg-slate-900 mt-2" elevation="8">
        <v-list-item 
          prepend-icon="mdi-lan" 
          @click="goToListeningPorts"
          class="dropdown-item"
        >
          <v-list-item-title class="font-weight-medium">Listening Ports</v-list-item-title>
        </v-list-item>
        <v-list-item 
          prepend-icon="mdi-calendar-clock" 
          @click="goToScheduledTasks"
          class="dropdown-item"
        >
          <v-list-item-title class="font-weight-medium">Scheduled Tasks</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- User Profile Menu -->
    <v-menu transition="scale-transition">
      <template v-slot:activator="{ props }">
        <v-btn
          color="white"
          variant="outlined"
          v-bind="props"
          class="ml-2 user-menu-btn"
        >
          <v-icon class="mr-2">mdi-account-circle</v-icon>
          {{ authStore.username }}
          <v-icon size="16" class="ml-2">mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <v-list class="user-dropdown-list bg-slate-900 mt-2" elevation="8">
        <v-list-item class="mb-2">
          <div class="d-flex align-center flex-column pb-2">
            <span class="text-caption text-grey-lighten-1 mb-1">Signed in as</span>
            <v-chip size="small" :color="getRoleColor(authStore.role)" variant="flat" class="font-weight-bold">
              {{ authStore.role?.toUpperCase() || 'USER' }}
            </v-chip>
          </div>
        </v-list-item>
        <v-divider class="mb-2 opacity-20"></v-divider>
        <v-list-item 
          v-if="authStore.role === 'root'"
          prepend-icon="mdi-account-group" 
          @click="goToUsers"
          class="dropdown-item"
        >
          <v-list-item-title class="font-weight-medium">User Management</v-list-item-title>
        </v-list-item>
        <v-list-item 
          prepend-icon="mdi-logout" 
          @click="handleLogout"
          class="dropdown-item logout-item"
        >
          <v-list-item-title class="font-weight-medium">Logout</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
    
    <v-btn v-if="false" color="error" variant="flat" @click="handleLogout" class="logout-btn">
      <v-icon left class="mr-2">mdi-logout</v-icon>
      Logout
    </v-btn>
  </v-app-bar>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
    {{ snackbar.text }}
  </v-snackbar>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const props = defineProps({
  title: {
    type: String,
    default: 'PM2 Services Monitor'
  },
  icon: {
    type: String,
    default: 'mdi-monitor-dashboard'
  },
  titleIconSize: {
    type: [String, Number],
    default: 28
  },
  showBack: {
    type: Boolean,
    default: false
  }
})

defineEmits(['refresh'])

const router = useRouter()
const authStore = useAuthStore()
const saving = ref(false)
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
})

const goBack = () => {
  router.push('/apps')
}

const goToMonitor = () => {
  router.push('/monitor')
}

const goToGitClone = () => {
  router.push('/git-clone')
}

const goToListeningPorts = () => {
  router.push('/ports')
}

const goToScheduledTasks = () => {
  router.push('/scheduled-tasks')
}

const goToUsers = () => {
  router.push('/users')
}

const handlePM2Save = async () => {
  saving.value = true
  try {
    const response = await api.savePM2()
    if (response.data.success) {
      showSnackbar('PM2 configuration saved successfully', 'success')
    } else {
      showSnackbar('Failed to save PM2 configuration', 'error')
    }
  } catch (error) {
    showSnackbar('Error saving PM2 configuration', 'error')
  } finally {
    saving.value = false
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const getRoleColor = (role) => {
  switch (role) {
    case 'root': return 'error'
    case 'support': return 'info'
    default: return 'primary'
  }
}

const showSnackbar = (text, color = 'success') => {
  snackbar.value.text = text
  snackbar.value.color = color
  snackbar.value.show = true
}
</script>

<style scoped>
.app-bar-gradient {
  background: #0d0d14 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important;
}

.toolbar-title {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #f1f5f9;
}

.action-header-btn {
  text-transform: none;
  font-weight: 500;
  font-size: 0.85rem;
  letter-spacing: 0;
  transition: opacity var(--transition-fast);
}

.user-menu-btn {
  text-transform: none;
  font-weight: 500;
  font-size: 0.85rem;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #94a3b8 !important;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}

.user-menu-btn:hover {
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #f1f5f9 !important;
}

.user-dropdown-list {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px !important;
  min-width: 200px;
  color: #f1f5f9;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.dropdown-item {
  transition: background-color var(--transition-fast);
  border-radius: 6px !important;
  margin-bottom: 2px;
  font-size: 0.875rem;
}

.dropdown-item:hover {
  background-color: rgba(99, 102, 241, 0.12) !important;
}

.logout-item:hover {
  background-color: rgba(239, 68, 68, 0.1) !important;
  color: #f87171 !important;
}
</style>
