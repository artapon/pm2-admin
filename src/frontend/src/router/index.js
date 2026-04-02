import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
    {
        path: '/setup',
        name: 'Setup',
        component: () => import('../views/Setup.vue')
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue')
    },
    {
        path: '/apps',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/apps/:appName',
        name: 'AppDetail',
        component: () => import('../views/AppDetail.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/ports',
        name: 'ListeningPorts',
        component: () => import('../views/ListeningPorts.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/git-clone',
        name: 'GitClone',
        component: () => import('../views/GitClone.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/monitor',
        name: 'ServerMonitor',
        component: () => import('../views/ServerMonitor.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/scheduled-tasks',
        name: 'ScheduledTasks',
        component: () => import('../views/ScheduledTasks.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/log-rotate',
        name: 'LogRotate',
        component: () => import('../views/LogRotate.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/plugins',
        name: 'Plugins',
        component: () => import('../views/Plugins.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/',
        redirect: '/apps'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // Always check setup status on first move if not already checked
    if (!authStore.isAuthenticated) {
        await authStore.checkSetupStatus()
    }

    if (authStore.setupRequired && to.path !== '/setup') {
        return next('/setup')
    }

    if (!authStore.setupRequired && to.path === '/setup') {
        return next('/login')
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        await authStore.checkSession()
        if (!authStore.isAuthenticated) {
            return next('/login')
        }
    }

    // Requires Root check
    if (to.meta.requiresAdmin && authStore.role !== 'root') {
        return next('/apps')
    }

    next()
})

export default router
