<template>
  <v-app-bar class="app-bar" dark app elevation="0" height="52">
    <!-- Mobile hamburger / desktop rail toggle -->
    <v-btn icon size="small" class="ml-1" @click="toggleDrawer">
      <v-icon size="20">mdi-menu</v-icon>
    </v-btn>

    <!-- Back button (AppDetail) -->
    <v-btn v-if="showBack" icon size="small" class="ml-1" @click="goBack">
      <v-icon size="20">mdi-arrow-left</v-icon>
    </v-btn>

    <v-toolbar-title v-if="title" class="toolbar-title ml-2">
      <v-icon class="mr-2 title-icon" :size="titleIconSize">{{ icon }}</v-icon>
      <span>{{ title }}</span>
    </v-toolbar-title>

    <v-spacer />

    <!-- PM2 Save (root only) -->
    <v-btn
      v-if="authStore.role === 'root'"
      variant="tonal"
      color="success"
      size="small"
      prepend-icon="mdi-content-save-outline"
      class="mr-2"
      :loading="saving"
      @click="handlePM2Save"
    >
      PM2 Save
    </v-btn>

    <v-btn icon size="small" class="mr-2" @click="$emit('refresh')">
      <v-icon size="20">mdi-refresh</v-icon>
    </v-btn>
  </v-app-bar>


</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '../stores/auth'
import { useLayoutStore } from '../stores/layout'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'

const props = defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: 'mdi-monitor-dashboard' },
  titleIconSize: { type: [String, Number], default: 22 },
  showBack: { type: Boolean, default: false }
})

defineEmits(['refresh'])

const router = useRouter()
const authStore = useAuthStore()
const layoutStore = useLayoutStore()
const { mobile } = useDisplay()
const { showAlert } = useAlert()

const saving = ref(false)

const toggleDrawer = () => {
  if (mobile.value) {
    layoutStore.drawer = !layoutStore.drawer
  } else {
    layoutStore.rail = !layoutStore.rail
  }
}

const goBack = () => {
  router.push('/apps')
}

const handlePM2Save = async () => {
  saving.value = true
  try {
    const response = await api.savePM2()
    if (response.data.success) {
      showAlert('PM2 configuration saved successfully', 'success')
    } else {
      showAlert('Failed to save PM2 configuration', 'error')
    }
  } catch {
    showAlert('Error saving PM2 configuration', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.app-bar {
  background: #0d0d14 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important;
}

.toolbar-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: #f1f5f9;
}

.title-icon {
  opacity: 0.8;
}
</style>
