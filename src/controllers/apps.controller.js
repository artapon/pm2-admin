const { listApps, describeApp, reloadApp, restartApp, restartAppWithRename, stopApp, flushApp, deleteApp, nodeInfo } = require('../providers/pm2/api');
const { readLogsReverse } = require('../utils/read-logs.util');
const { getCurrentGitBranch, getCurrentGitCommit, gitPull, gitClone } = require('../utils/git.util');
const { getEnvFileRawContent, getEnvFileRawBackupContent, parseEnv, setEnvDataSyncAndBackup } = require('../utils/env.util');
const { formatBytes } = require('../utils/format.util');
const AnsiConverter = require('ansi-to-html');
const ansiConvert = new AnsiConverter();
const fs = require('fs');
const path = require('path');
const si = require('systeminformation');

const getAllApps = async (req, res) => {
    try {
        const apps = await listApps();
        const node = await nodeInfo();

        let stoppedCount = 0;
        let erroredCount = 0;
        let onlineCount = 0;

        if (apps) {
            apps.forEach(app => {
                if (app.status === 'stopped') stoppedCount++;
                else if (app.status === 'online') onlineCount++;
                else if (app.status === 'errored') erroredCount++;
            });
        }

        res.json({
            success: true,
            data: {
                apps,
                node,
                counts: {
                    stopped: stoppedCount,
                    online: onlineCount,
                    errored: erroredCount,
                    total: apps ? apps.length : 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getDashboard = async (req, res) => {
    try {
        const apps = await listApps();
        const node = await nodeInfo();
        const username = req.session?.username || null;
        const cwd = path.resolve(__dirname, '../../..');

        let isWindows = null;
        let stoppedCount = 0;
        let erroredCount = 0;
        let onlineCount = 0;

        if (apps) {
            apps.forEach(app => {
                if (app.status === 'stopped') stoppedCount++;
                else if (app.status === 'online') onlineCount++;
                else if (app.status === 'errored') erroredCount++;
            });
        }

        let serverinfo = {};
        try {
            const [cpu, cpuInfo, mem, os, disk, time, networks] = await Promise.all([
                si.currentLoad(),
                si.cpu(),
                si.mem(),
                si.osInfo(),
                si.fsSize(),
                si.time(),
                si.networkInterfaces()
            ]);

            const network = networks.filter(n => n.default);
            isWindows = os.platform.toLowerCase().includes('win');

            serverinfo = {
                cpuInfo: `${cpuInfo.manufacturer} ${cpuInfo.brand} ${cpuInfo.speed} GHz ${cpuInfo.cores} cores.`,
                currentCPU: cpu.currentLoad.toFixed(2),
                memtotal: formatBytes(mem.total),
                memfree: formatBytes(mem.free),
                memused: formatBytes(mem.used),
                memavailable: formatBytes(mem.available),
                memPercent: (mem.used * 100 / mem.total).toFixed(2),
                osinfo: `${os.platform} ${os.release} | Hostname : ${os.hostname} | IP : ${network[0]?.ip4 || 'N/A'}`,
                disks: disk.map(d => ({
                    fs: d.fs,
                    total: formatBytes(d.size || 0),
                    used: formatBytes(d.used || 0),
                    available: formatBytes(d.available || 0),
                    percent: d.size ? (d.used * 100 / d.size).toFixed(2) : '0',
                    mount: d.mount,
                    type: d.type
                })),
                timeinfo: new Date(time.current) + ' ' + time.timezoneName
            };
            console.log(`[Diagnostic] Dashboard Disk Scan: Found ${serverinfo.disks.length} disks.`);
        } catch (e) {
            console.log(e);
        }

        res.json({
            success: true,
            data: { apps, serverinfo, username, isWindows, stoppedCount, onlineCount, erroredCount, cwd, node }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getApp = async (req, res) => {
    try {
        const { appName } = req.params;
        let app = await describeApp(appName);

        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const [networks, os] = await Promise.all([si.networkInterfaces(), si.osInfo()]);
        const isWindows = os.platform.toLowerCase().includes('win');

        let portHTTP = '';
        let portHTTPS = '';
        if (app.name.toString().indexOf(':') !== -1) {
            portHTTP = app.name.toString().split(':')[1];
            if (portHTTP.indexOf(',') !== -1) {
                portHTTPS = portHTTP.split(',')[1];
                portHTTP = portHTTP.split(',')[0];
            }
        }

        const network = networks.filter(n => n.default);
        app.app_base_url = network[0]?.ip4 || 'localhost';
        app.port_http = portHTTP;
        app.port_https = portHTTPS;
        app.git_branch = await getCurrentGitBranch(app.pm2_env_cwd);
        app.git_commit = await getCurrentGitCommit(app.pm2_env_cwd);
        app.env_file_raw = await getEnvFileRawContent(app.pm2_env_cwd);
        app.env_file_raw_backup = await getEnvFileRawBackupContent(app.pm2_env_cwd);

        const [stdout, stderr] = await Promise.all([
            readLogsReverse({ filePath: app.pm_out_log_path }),
            readLogsReverse({ filePath: app.pm_err_log_path })
        ]);

        stdout.lines = stdout.lines.map(log => ansiConvert.toHtml(log)).join('<br/>');
        stderr.lines = stderr.lines.map(log => ansiConvert.toHtml(log)).join('<br/>');

        let customlog = null;
        const customLogPath = path.join(app.pm2_env_cwd, 'logs');
        if (fs.existsSync(customLogPath)) {
            const logFiles = fs.readdirSync(customLogPath)
                .filter(file => fs.lstatSync(path.join(customLogPath, file)).isFile())
                .map(file => ({ file, mtime: fs.lstatSync(path.join(customLogPath, file)).mtime }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            if (logFiles[0]) {
                customlog = await readLogsReverse({ filePath: path.join(customLogPath, logFiles[0].file) });
                customlog.lines = customlog.lines.map(log => ansiConvert.toHtml(log)).join('<br/>');
            }
        }

        res.json({
            success: true,
            data: {
                app,
                logs: { stdout, stderr, customlog },
                isWindows,
                username: req.session?.username || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAppLogs = async (req, res) => {
    try {
        const { appName, logType } = req.params;
        const { nextKey } = req.query;

        if (logType !== 'stdout' && logType !== 'stderr') {
            return res.status(400).json({ success: false, error: 'Log Type must be stdout or stderr' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const filePath = logType === 'stdout' ? app.pm_out_log_path : app.pm_err_log_path;
        const logs = await readLogsReverse({ filePath, nextKey });
        logs.lines = logs.lines.map(log => ansiConvert.toHtml(log)).join('<br/>');

        res.json({ success: true, data: { logs } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const reloadAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        const apps = await reloadApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            res.json({ success: true, message: `App ${appName} reloaded successfully` });
        } else {
            res.status(400).json({ success: false, error: 'Failed to reload app' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const restartAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        const apps = await restartApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            res.json({ success: true, message: `App ${appName} restarted successfully` });
        } else {
            res.status(400).json({ success: false, error: 'Failed to restart app' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const stopAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        const apps = await stopApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            res.json({ success: true, message: `App ${appName} stopped successfully` });
        } else {
            res.status(400).json({ success: false, error: 'Failed to stop app' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const flushAppLogs = async (req, res) => {
    try {
        const { appName } = req.params;
        await flushApp(appName);
        res.json({ success: true, message: `Logs for ${appName} flushed successfully` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateAppEnv = async (req, res) => {
    try {
        const { appName } = req.params;
        const { env_content } = req.body;

        if (!env_content) {
            return res.status(400).json({ success: false, error: 'env_content is required' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const envContent = await parseEnv(env_content);
        await setEnvDataSyncAndBackup(app.pm2_env_cwd, appName, envContent);

        res.json({ success: true, message: `Environment file for ${appName} updated successfully` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        const apps = await deleteApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            res.json({ success: true, message: `App ${appName} deleted successfully` });
        } else {
            res.status(400).json({ success: false, error: 'Failed to delete app' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const restartAppWithRenameAction = async (req, res) => {
    try {
        const { appName } = req.params;
        const { newAppName, nodeArgs } = req.body;

        if (!newAppName) {
            return res.status(400).json({ success: false, error: 'newAppName is required' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const apps = await restartAppWithRename(appName, newAppName, app.exec_path, app.pm2_env_cwd, nodeArgs);

        if (Array.isArray(apps) && apps.length > 0) {
            res.json({ success: true, message: `App restarted successfully with new name: ${newAppName}` });
        } else {
            res.status(400).json({ success: false, error: 'Failed to restart app with new name' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const gitPullApp = async (req, res) => {
    try {
        const { appName } = req.params;
        const { username, password, branch = 'master' } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'username and password are required' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        await gitPull(appName, app.pm2_env_cwd, username, password, branch);

        res.json({ success: true, message: `Git pull for ${appName} completed` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getAllApps,
    getDashboard,
    getApp,
    getAppLogs,
    reloadAppAction,
    restartAppAction,
    restartAppWithRenameAction,
    stopAppAction,
    deleteAppAction,
    flushAppLogs,
    updateAppEnv,
    gitPullApp
};
