import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    withCredentials: true
})

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Use window.location as the simplest way to clear state and redirect
            // Alternatively, could import the store and router, but this is cleaner to avoid circular deps
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default {
    // Auth
    login(username, password) {
        return api.post('/auth/login', { username, password })
    },
    logout() {
        return api.post('/auth/logout')
    },
    getSession() {
        return api.get('/auth/session')
    },

    // Apps
    getAllApps() {
        return api.get('/apps')
    },
    getDashboard() {
        return api.get('/apps/dashboard')
    },
    getApp(appName) {
        return api.get(`/apps/${appName}`)
    },
    getAppLogs(appName, logType, nextKey) {
        return api.get(`/apps/${appName}/logs/${logType}`, { params: { nextKey } })
    },
    reloadApp(appName) {
        return api.post(`/apps/${appName}/reload`)
    },
    restartApp(appName) {
        return api.post(`/apps/${appName}/restart`)
    },
    restartAppWithRename(appName, newAppName, nodeArgs) {
        return api.post(`/apps/${appName}/restart-rename`, { newAppName, nodeArgs })
    },
    stopApp(appName) {
        return api.post(`/apps/${appName}/stop`)
    },
    deleteApp(appName) {
        return api.post(`/apps/${appName}/delete`)
    },
    flushAppLogs(appName) {
        return api.post(`/apps/${appName}/flush`)
    },
    updateAppEnv(appName, envContent) {
        return api.post(`/apps/${appName}/updateEnv`, { env_content: envContent })
    },
    gitPullApp(appName, username, password, branch) {
        return api.post(`/apps/${appName}/gitpull`, { username, password, branch })
    },

    // System
    getServerInfo() {
        return api.get('/system/info')
    },
    getListeningPorts() {
        return api.get('/system/ports')
    },
    savePM2() {
        return api.post('/system/pm2/save')
    },
    gitClone(data) {
        return api.post('/system/git/clone', data)
    },

    // System Monitoring
    getSystemMonitor() {
        return api.get('/system/monitor')
    },
    getTopProcesses() {
        return api.get('/system/processes')
    },
    getSharedFolders() {
        return api.get('/system/shares')
    },
    getScheduledTasks() {
        return api.get('/system/scheduled-tasks');
    },

    // Users (IT Admin only)
    getUsers() {
        return api.get('/users');
    },
    createUser(userData) {
        return api.post('/users', userData);
    },
    updateUser(id, userData) {
        return api.patch(`/users/${id}`, userData);
    },
    deleteUser(id) {
        return api.delete(`/users/${id}`);
    },
    checkSetup() {
        return api.get('/auth/setup-check');
    },
    setupInitial(data) {
        return api.post('/auth/setup-initial', data);
    }
}
