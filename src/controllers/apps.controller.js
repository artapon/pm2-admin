const { listApps, describeApp, describeAppRaw, reloadApp, restartApp, resetApp, restartAppWithRename, stopApp, flushApp, deleteApp, nodeInfo } = require('../providers/pm2/api');
const { readLogsReverse } = require('../utils/read-logs.util');
const { getCurrentGitBranch, getCurrentGitCommit, gitPull, listBranches, checkoutBranch, gitClone } = require('../utils/git.util');
const { getEnvFileRawContent, getEnvFileRawBackupContent, parseEnv, setEnvDataSyncAndBackup, resolveEnvFilePath } = require('../utils/env.util');
const { formatBytes } = require('../utils/format.util');
const fs = require('fs');
const path = require('path');
const sysinfo = require('../utils/sysinfo.util');

// Logs are sent as plain text — the UI renders them with text interpolation, never v-html,
// so the terminal output is shown verbatim (quotes, <>, emoji) without HTML escaping.
const MAX_LOG_LINE = 4096;
// CSI/SGR colour codes, OSC sequences and the remaining single-char escapes
const ANSI_RE = /\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)|\x1B[@-Z\\-_]|\x1B\[[0-?]*[ -\/]*[@-~]/g;
const sanitizeLogLine = (line) => String(line)
    .replace(ANSI_RE, '')
    // drop control chars that would break rendering, keep tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, MAX_LOG_LINE);
const formatLogLines = (lines) => lines.map(sanitizeLogLine).join('\n');

// Strict validators — applied to user-controlled inputs that flow into PM2/git/fs ops.
const APP_NAME_RE = /^[A-Za-z0-9_.,:\-]{1,128}$/;
const BRANCH_RE = /^[A-Za-z0-9._\-\/]{1,128}$/;
// Only allow a small whitelist of safe Node CLI flags, no values, no paths, no --require/--inspect/etc.
const NODE_ARG_RE = /^--(max-old-space-size=\d{1,5}|use-strict|no-deprecation|no-warnings|throw-deprecation|preserve-symlinks|preserve-symlinks-main)$/;
const isValidAppName = (n) => typeof n === 'string' && APP_NAME_RE.test(n);
const isRoot = (req) => req.session && req.session.role === 'root';
const validateNodeArgs = (raw) => {
    if (raw === undefined || raw === null || raw === '') return '';
    if (typeof raw !== 'string') throw new Error('Invalid nodeArgs');
    if (raw.length > 256) throw new Error('Invalid nodeArgs');
    const tokens = raw.trim().split(/\s+/);
    for (const t of tokens) {
        if (!NODE_ARG_RE.test(t)) throw new Error(`Disallowed node argument: ${t}`);
    }
    return tokens.join(' ');
};

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
        const username = req.session?.username || null;
        const cwd = path.resolve(__dirname, '../../..');

        let isWindows = null;
        let stoppedCount = 0;
        let erroredCount = 0;
        let onlineCount = 0;
        let serverinfo = {};

        // The PM2 list (a CLI spawn) and the machine metrics (WMI) are unrelated — kick both
        // off before awaiting either, so the response costs the slower one, not their sum.
        const metricsPromise = Promise.all([
            sysinfo.currentLoad(),
            sysinfo.cpuInfo(),
            sysinfo.mem(),
            sysinfo.osInfo(),
            sysinfo.fsSize(),
            sysinfo.time(),
            sysinfo.networkInterfaces()
        ]);

        const [apps, node] = await Promise.all([listApps(), nodeInfo()]);

        if (apps) {
            apps.forEach(app => {
                if (app.status === 'stopped') stoppedCount++;
                else if (app.status === 'online') onlineCount++;
                else if (app.status === 'errored') erroredCount++;
            });
        }

        try {
            const [cpu, cpuInfo, mem, os, disk, time, networks] = await metricsPromise;

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
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
        let app = await describeApp(appName);

        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        let portHTTP = '';
        let portHTTPS = '';
        if (app.name.toString().indexOf(':') !== -1) {
            portHTTP = app.name.toString().split(':')[1];
            if (portHTTP.indexOf(',') !== -1) {
                portHTTPS = portHTTP.split(',')[1];
                portHTTP = portHTTP.split(',')[0];
            }
        }

        // Everything below is independent I/O (WMI, two git spawns, env files, both logs).
        // Run it as one batch instead of a serial chain.
        // Only expose .env contents to root — they typically contain DB passwords/API keys
        const envPath = isRoot(req)
            ? resolveEnvFilePath({ cwd: app.pm2_env_cwd, execPath: app.exec_path, envFile: app.env_file })
            : null;

        const [baseUrl, isWindows, gitBranch, gitCommit, envRaw, envRawBackup, stdout, stderr] = await Promise.all([
            sysinfo.defaultIp(),
            sysinfo.isWindows(),
            getCurrentGitBranch(app.pm2_env_cwd),
            getCurrentGitCommit(app.pm2_env_cwd),
            envPath ? getEnvFileRawContent(envPath) : null,
            envPath ? getEnvFileRawBackupContent(envPath) : null,
            readLogsReverse({ filePath: app.pm_out_log_path }),
            readLogsReverse({ filePath: app.pm_err_log_path })
        ]);

        app.app_base_url = baseUrl;
        app.port_http = portHTTP;
        app.port_https = portHTTPS;
        app.git_branch = gitBranch;
        app.git_commit = gitCommit;
        app.env_file_path = envPath;
        app.env_file_raw = envRaw;
        app.env_file_raw_backup = envRawBackup;

        stdout.lines = formatLogLines(stdout.lines);
        stderr.lines = formatLogLines(stderr.lines);

        let customlog = null;
        const customLogPath = path.join(app.pm2_env_cwd, 'logs');
        if (fs.existsSync(customLogPath)) {
            const logFiles = fs.readdirSync(customLogPath)
                .filter(file => fs.lstatSync(path.join(customLogPath, file)).isFile())
                .map(file => ({ file, mtime: fs.lstatSync(path.join(customLogPath, file)).mtime }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            if (logFiles[0]) {
                customlog = await readLogsReverse({ filePath: path.join(customLogPath, logFiles[0].file) });
                customlog.lines = formatLogLines(customlog.lines);
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

        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
        if (logType !== 'stdout' && logType !== 'stderr') {
            return res.status(400).json({ success: false, error: 'Log Type must be stdout or stderr' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const filePath = logType === 'stdout' ? app.pm_out_log_path : app.pm_err_log_path;
        const logs = await readLogsReverse({ filePath, nextKey });
        logs.lines = formatLogLines(logs.lines);

        res.json({ success: true, data: { logs } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAppDescribe = async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const raw = await describeAppRaw(appName);
        // The CLI colours its table with ANSI codes — the same sanitiser the logs use
        // strips them, leaving the box-drawing characters intact
        const output = formatLogLines(raw.split('\n'));

        res.json({ success: true, data: { output } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const reloadAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
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
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
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

const resetAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
        const apps = await resetApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            res.json({ success: true, message: `Counters for ${appName} reset successfully` });
        } else {
            res.status(400).json({ success: false, error: 'Failed to reset app counters' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const stopAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
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
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
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

        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
        if (typeof env_content !== 'string' || !env_content) {
            return res.status(400).json({ success: false, error: 'env_content is required' });
        }
        if (env_content.length > 64 * 1024) {
            return res.status(413).json({ success: false, error: '.env content too large' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const envPath = resolveEnvFilePath({ cwd: app.pm2_env_cwd, execPath: app.exec_path, envFile: app.env_file });
        const envContent = await parseEnv(env_content);
        const updated = setEnvDataSyncAndBackup(envPath, appName, envContent);
        if (!updated) {
            return res.status(500).json({ success: false, error: `Could not update ${envPath || '.env'}` });
        }

        res.json({ success: true, message: `Environment file for ${appName} updated successfully` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteAppAction = async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
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

        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
        if (!isValidAppName(newAppName)) {
            return res.status(400).json({ success: false, error: 'Invalid new app name (alphanumeric, _ . , : - only)' });
        }

        let safeNodeArgs;
        try {
            safeNodeArgs = validateNodeArgs(nodeArgs);
        } catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const apps = await restartAppWithRename(appName, newAppName, app.exec_path, app.pm2_env_cwd, safeNodeArgs);

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
        const { username = '', password = '', branch, stash = false } = req.body;

        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }
        // Both or neither — a lone username would silently be ignored
        if (Boolean(username) !== Boolean(password)) {
            return res.status(400).json({ success: false, error: 'Provide both username and password, or neither' });
        }
        if (username.length > 200 || password.length > 500) {
            return res.status(400).json({ success: false, error: 'username/password too long' });
        }
        if (branch !== undefined && (typeof branch !== 'string' || !BRANCH_RE.test(branch))) {
            return res.status(400).json({ success: false, error: 'Invalid branch' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const cwd = app.pm2_env_cwd;
        // Falling back to the checked-out branch beats defaulting to master — an app on
        // any other branch would otherwise be pulled onto the wrong one
        const targetBranch = branch || await getCurrentGitBranch(cwd) || 'master';

        const result = await gitPull(appName, cwd, username, password, targetBranch, { stash: Boolean(stash) });

        res.json({
            success: true,
            message: `Git pull for ${appName} completed`,
            data: { branch: targetBranch, output: result.output, stashed: result.stashed }
        });
    } catch (error) {
        // gitPull already redacted any credential-bearing remote out of the message.
        // `stashed` matters on failure too: the local changes are parked in the stash
        // and the user needs to know they are recoverable.
        res.status(500).json({ success: false, error: error.message, data: { stashed: Boolean(error.stashed) } });
    }
};

const getAppBranches = async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const fetch = req.query.fetch === '1' || req.query.fetch === 'true';
        const result = await listBranches(appName, app.pm2_env_cwd, { fetch });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to list branches — the app folder may not be a git repository' });
    }
};

const checkoutAppBranch = async (req, res) => {
    try {
        const { appName } = req.params;
        const { branch, stash = false } = req.body;

        if (!isValidAppName(appName)) {
            return res.status(400).json({ success: false, error: 'Invalid app name' });
        }
        if (typeof branch !== 'string' || !BRANCH_RE.test(branch)) {
            return res.status(400).json({ success: false, error: 'Invalid branch' });
        }

        const app = await describeApp(appName);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const result = await checkoutBranch(appName, app.pm2_env_cwd, branch, { stash: Boolean(stash) });

        res.json({
            success: true,
            message: `Switched ${appName} to ${result.branch}`,
            data: result
        });
    } catch (error) {
        // checkoutBranch already redacted the message; `stashed` tells the user their
        // local changes are parked and recoverable even when the switch failed
        res.status(500).json({ success: false, error: error.message, data: { stashed: Boolean(error.stashed) } });
    }
};

module.exports = {
    getAllApps,
    getDashboard,
    getApp,
    getAppLogs,
    getAppDescribe,
    reloadAppAction,
    restartAppAction,
    resetAppAction,
    restartAppWithRenameAction,
    stopAppAction,
    deleteAppAction,
    flushAppLogs,
    updateAppEnv,
    gitPullApp,
    getAppBranches,
    checkoutAppBranch
};
