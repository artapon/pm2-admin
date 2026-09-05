<template>
  <v-navigation-drawer
    v-model="layoutStore.drawer"
    :rail="layoutStore.rail && !mobile"
    :temporary="mobile"
    color="#0d0d14"
    class="nav-sidebar"
    width="240"
  >
    <!-- Brand Header -->
    <div class="sidebar-brand" :class="{ 'sidebar-brand--rail': layoutStore.rail && !mobile }">
      <div class="brand-logo">
        <v-icon size="22" color="primary">mdi-monitor-dashboard</v-icon>
      </div>
      <span v-if="!layoutStore.rail || mobile" class="brand-name">PM2 Admin</span>
      <v-btn
        v-if="!mobile"
        :icon="layoutStore.rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
        variant="text"
        size="small"
        class="rail-toggle"
        @click="layoutStore.rail = !layoutStore.rail"
      />
    </div>

    <v-divider class="sidebar-divider" />

    <!-- Main Nav -->
    <v-list nav density="compact" class="sidebar-nav px-2 pt-2">
      <template v-for="item in navItems" :key="item.to">
        <v-list-item
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :active="isActive(item.to)"
          active-color="primary"
          rounded="lg"
          class="nav-item mb-1"
          :class="{ 'nav-item--active': isActive(item.to) }"
        >
          <template v-if="layoutStore.rail && !mobile" v-slot:title>
            <v-tooltip :text="item.title" location="end">
              <template v-slot:activator="{ props }">
                <span v-bind="props"></span>
              </template>
            </v-tooltip>
          </template>

          <!-- Expander for the environment list; the item itself still navigates -->
          <template v-if="item.to === '/environments' && showEnvSubmenu" v-slot:append>
            <v-icon
              size="16"
              class="submenu-chevron"
              @click.prevent.stop="envOpen = !envOpen"
            >
              {{ envOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </template>
        </v-list-item>

        <!-- Environment submenu -->
        <v-expand-transition v-if="item.to === '/environments'">
          <div v-show="envOpen && showEnvSubmenu" class="submenu mb-1">
            <v-list-item
              v-for="env in environments"
              :key="env.id"
              :to="`/environments/${env.id}`"
              :active="route.path === `/environments/${env.id}`"
              active-color="primary"
              rounded="lg"
              class="nav-item nav-subitem"
              :class="{ 'nav-item--active': route.path === `/environments/${env.id}` }"
            >
              <template v-slot:prepend>
                <span class="env-dot" :class="env.enabled ? 'env-dot--on' : 'env-dot--off'"></span>
              </template>
              <v-list-item-title class="submenu-title">{{ env.name }}</v-list-item-title>
            </v-list-item>
          </div>
        </v-expand-transition>
      </template>

      <!-- Root-only items -->
      <template v-if="authStore.role === 'root'">
        <v-divider class="sidebar-divider my-2" />
        <div v-if="!layoutStore.rail || mobile" class="nav-section-label px-3 mb-1">
          ADMIN
        </div>
        <v-list-item
          v-for="item in rootItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :active="isActive(item.to)"
          active-color="primary"
          rounded="lg"
          class="nav-item mb-1"
          :class="{ 'nav-item--active': isActive(item.to) }"
        />
      </template>
    </v-list>

    <template v-slot:append>
      <div class="sidebar-footer">
        <v-divider class="sidebar-divider mb-2" />

        <!-- User Section -->
        <div class="user-section px-2 pb-3">
          <div
            v-if="!layoutStore.rail || mobile"
            class="user-info mb-2"
          >
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center gap-2">
                <v-avatar size="28" color="primary" class="user-avatar">
                  <span class="text-caption font-weight-bold">{{ userInitial }}</span>
                </v-avatar>
                <div class="user-details">
                  <div class="user-name">{{ authStore.username }}</div>
                  <v-chip
                    size="x-small"
                    :color="getRoleColor(authStore.role)"
                    variant="flat"
                    class="role-chip"
                  >
                    {{ authStore.role?.toUpperCase() }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>

          <v-btn
            :icon="layoutStore.rail && !mobile"
            variant="tonal"
            color="error"
            size="small"
            block
            @click="handleLogout"
            class="logout-btn"
          >
            <v-icon :class="{ 'mr-2': !layoutStore.rail || mobile }" size="18">mdi-logout</v-icon>
            <span v-if="!layoutStore.rail || mobile">Logout</span>
          </v-btn>
        </div>
      </div>
    </template>
  </v-navigation-drawer>

</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '../stores/auth'
import { useLayoutStore } from '../stores/layout'
import api from '../services/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const layoutStore = useLayoutStore()
const { mobile } = useDisplay()

const navItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/apps' },
  { title: 'Environments', icon: 'mdi-server-network', to: '/environments' },
  { title: 'Monitor', icon: 'mdi-chart-line', to: '/monitor' },
  { title: 'Ports', icon: 'mdi-lan', to: '/ports' },
  { title: 'Scheduled Tasks', icon: 'mdi-calendar-clock-outline', to: '/scheduled-tasks' },
]

const rootItems = [
  { title: 'Plugins', icon: 'mdi-puzzle-outline', to: '/plugins' },
  { title: 'Log Rotate', icon: 'mdi-rotate-right', to: '/log-rotate' },
  { title: 'NVM', icon: 'mdi-nodejs', to: '/nvm' },
  { title: 'Git Clone', icon: 'mdi-source-branch', to: '/git-clone' },
  { title: 'Users', icon: 'mdi-account-group-outline', to: '/users' },
]

// Environment submenu -------------------------------------------------------
const environments = ref([])
const envOpen = ref(route.path.startsWith('/environments'))

// Collapsed rail has no room for names, so the submenu only shows when expanded.
const showEnvSubmenu = computed(() =>
  environments.value.length > 0 && (!layoutStore.rail || mobile.value)
)

const loadEnvironments = async () => {
  if (!authStore.isAuthenticated) return
  try {
    const res = await api.getEnvironments()
    if (res.data.success) environments.value = res.data.data
  } catch {
    environments.value = []
  }
}

// Refresh on login and whenever the environments page is opened, so adds and
// deletes made there show up in the menu without a reload.
watch(() => authStore.isAuthenticated, (ok) => { if (ok) loadEnvironments() })
watch(() => route.path, (path) => {
  if (path.startsWith('/environments')) {
    envOpen.value = true
    if (path === '/environments') loadEnvironments()
  }
})

onMounted(loadEnvironments)

const isActive = (to) => {
  if (to === '/apps') return route.path === '/apps' || route.path.startsWith('/apps/')
  // Keep the menu item lit while viewing one environment's detail page
  if (to === '/environments') return route.path === '/environments' || route.path.startsWith('/environments/')
  return route.path === to
}

const userInitial = computed(() => {
  return authStore.username?.charAt(0).toUpperCase() || '?'
})

const getRoleColor = (role) => {
  switch (role) {
    case 'root': return 'error'
    case 'support': return 'info'
    default: return 'primary'
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.nav-sidebar {
  border-right: 1px solid rgba(255, 255, 255, 0.07) !important;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px;
  height: 56px;
}

.sidebar-brand--rail {
  justify-content: center;
  padding: 16px 0;
}

.brand-logo {
  width: 32px;
  height: 32px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.01em;
  flex: 1;
}

.rail-toggle {
  color: #475569 !important;
  margin-left: auto;
}

.rail-toggle:hover {
  color: #94a3b8 !important;
}

.sidebar-divider {
  border-color: rgba(255, 255, 255, 0.07) !important;
}

.sidebar-nav {
  flex: 1;
}

.nav-section-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #475569;
  text-transform: uppercase;
}

.nav-item {
  color: #ffffff !important;
  font-size: 0.875rem !important;
  transition: background-color 0.15s, color 0.15s;
  min-height: 38px !important;
}

.nav-item:hover {
  background-color: rgba(99, 102, 241, 0.08) !important;
  color: #ffffff !important;
}

.nav-item--active {
  background-color: rgba(99, 102, 241, 0.15) !important;
  color: #a5b4fc !important;
}

.nav-item :deep(.v-list-item__prepend .v-icon) {
  color: inherit !important;
}

.nav-item :deep(.v-list-item-title) {
  color: inherit !important;
}

.submenu-chevron {
  color: #64748b !important;
  border-radius: 4px;
}

.submenu-chevron:hover {
  color: #e2e8f0 !important;
}

.submenu {
  padding-left: 14px;
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  margin-left: 18px;
}

.nav-subitem {
  min-height: 32px !important;
  font-size: 0.8rem !important;
}

.submenu-title {
  font-size: 0.8rem !important;
}

.env-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

.env-dot--on { background: #22c55e; }
.env-dot--off { background: #475569; }

.sidebar-footer {
  padding: 0;
}

.pm2-save-btn {
  text-transform: none;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0;
}

.user-section {
  padding-left: 8px;
  padding-right: 8px;
}

.user-info {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 8px 10px;
}

.user-avatar {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.user-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: #e2e8f0;
  line-height: 1.2;
  padding-left:5px;
}

.role-chip {
  font-size: 0.6rem !important;
  height: 16px !important;
  letter-spacing: 0.05em;
}

.logout-btn {
  text-transform: none;
  font-size: 0.8rem;
  letter-spacing: 0;
  justify-content: flex-start !important;
}
</style>
