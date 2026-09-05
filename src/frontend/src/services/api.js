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
        return api.get(`/apps/${encodeURIComponent(appName)}`)
    },
    getAppDescribe(appName) {
        return api.get(`/apps/${encodeURIComponent(appName)}/describe`)
    },
    getAppLogs(appName, logType, nextKey) {
        return api.get(`/apps/${encodeURIComponent(appName)}/logs/${logType}`, { params: { nextKey } })
    },
    reloadApp(appName) {
        return api.post(`/apps/${encodeURIComponent(appName)}/reload`)
    },
    restartApp(appName) {
        return api.post(`/apps/${encodeURIComponent(appName)}/restart`)
    },
    restartAppWithRename(appName, newAppName, nodeArgs) {
        return api.post(`/apps/${encodeURIComponent(appName)}/restart-rename`, { newAppName, nodeArgs })
    },
    resetApp(appName) {
        return api.post(`/apps/${encodeURIComponent(appName)}/reset`)
    },
    stopApp(appName) {
        return api.post(`/apps/${encodeURIComponent(appName)}/stop`)
    },
    deleteApp(appName) {
        return api.post(`/apps/${encodeURIComponent(appName)}/delete`)
    },
    flushAppLogs(appName) {
        return api.post(`/apps/${encodeURIComponent(appName)}/flush`)
    },
    updateAppEnv(appName, envContent) {
        return api.post(`/apps/${encodeURIComponent(appName)}/updateEnv`, { env_content: envContent })
    },
    gitPullApp(appName, { username = '', password = '', branch, stash = false } = {}) {
        return api.post(`/apps/${encodeURIComponent(appName)}/gitpull`, { username, password, branch, stash })
    },
    getAppBranches(appName, fetch = false) {
        return api.get(`/apps/${encodeURIComponent(appName)}/branches`, { params: fetch ? { fetch: 1 } : {} })
    },
    checkoutAppBranch(appName, branch, stash = false) {
        return api.post(`/apps/${encodeURIComponent(appName)}/branch`, { branch, stash })
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
    getLogRotateConfig() {
        return api.get('/system/logrotate');
    },
    setLogRotateConfig(key, value) {
        return api.post('/system/logrotate', { key, value });
    },
    installLogRotate() {
        return api.post('/system/logrotate/install');
    },

    // NVM
    getNvmInfo() {
        return api.get('/nvm');
    },
    getNvmAvailableVersions() {
        return api.get('/nvm/available');
    },
    installNodeVersion(version) {
        return api.post('/nvm/install', { version });
    },

    // Environments (remote pm2-agent servers)
    getEnvironments() {
        return api.get('/environments')
    },
    getEnvironmentsOverview() {
        return api.get('/environments/overview')
    },
    getEnvironment(id) {
        return api.get(`/environments/${id}`)
    },
    createEnvironment(data) {
        return api.post('/environments', data)
    },
    updateEnvironment(id, data) {
        return api.patch(`/environments/${id}`, data)
    },
    deleteEnvironment(id) {
        return api.delete(`/environments/${id}`)
    },
    // Saved environment when `id` is given, otherwise the unsaved values in the dialog
    testEnvironment(id, data) {
        return id ? api.post(`/environments/${id}/test`) : api.post('/environments/test', data)
    },

    // Environment data — same payload shapes as the local endpoints above
    getEnvironmentInfo(id) {
        return api.get(`/environments/${id}/info`)
    },
    getEnvironmentApps(id) {
        return api.get(`/environments/${id}/apps`)
    },
    getEnvironmentApp(id, appName) {
        return api.get(`/environments/${id}/apps/${encodeURIComponent(appName)}`)
    },
    getEnvironmentAppLogs(id, appName, logType, nextKey) {
        return api.get(`/environments/${id}/apps/${encodeURIComponent(appName)}/logs/${logType}`, { params: { nextKey } })
    },
    getEnvironmentAppDescribe(id, appName) {
        return api.get(`/environments/${id}/apps/${encodeURIComponent(appName)}/describe`)
    },
    // Remote app .env — root only
    getEnvironmentAppEnv(id, appName) {
        return api.get(`/environments/${id}/apps/${encodeURIComponent(appName)}/env`)
    },
    updateEnvironmentAppEnv(id, appName, envContent) {
        return api.post(`/environments/${id}/apps/${encodeURIComponent(appName)}/env`, { env_content: envContent })
    },
    // Remote app actions — root only, and refused by an agent running read-only
    reloadEnvironmentApp(id, appName) {
        return api.post(`/environments/${id}/apps/${encodeURIComponent(appName)}/reload`)
    },
    restartEnvironmentApp(id, appName) {
        return api.post(`/environments/${id}/apps/${encodeURIComponent(appName)}/restart`)
    },
    stopEnvironmentApp(id, appName) {
        return api.post(`/environments/${id}/apps/${encodeURIComponent(appName)}/stop`)
    },
    resetEnvironmentApp(id, appName) {
        return api.post(`/environments/${id}/apps/${encodeURIComponent(appName)}/reset`)
    },
    flushEnvironmentApp(id, appName) {
        return api.post(`/environments/${id}/apps/${encodeURIComponent(appName)}/flush`)
    },
    deleteEnvironmentApp(id, appName) {
        return api.delete(`/environments/${id}/apps/${encodeURIComponent(appName)}`)
    },
    getEnvironmentSystemInfo(id) {
        return api.get(`/environments/${id}/system/info`)
    },
    getEnvironmentMonitor(id) {
        return api.get(`/environments/${id}/system/monitor`)
    },
    getEnvironmentPorts(id) {
        return api.get(`/environments/${id}/system/ports`)
    },
    getEnvironmentProcesses(id) {
        return api.get(`/environments/${id}/system/processes`)
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
    changePassword(id, currentPassword, newPassword) {
        return api.post(`/users/${id}/change-password`, { currentPassword, newPassword });
    },
    checkSetup() {
        return api.get('/auth/setup-check');
    },
    getSetupEnvConfig() {
        return api.get('/auth/setup-env');
    },
    setupInitial(data) {
        return api.post('/auth/setup-initial', data);
    }
}
