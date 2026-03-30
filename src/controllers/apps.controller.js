const { listApps, describeApp, reloadApp, restartApp, restartAppWithRename, stopApp, flushApp, deleteApp, pm2Save, nodeInfo } = require('../providers/pm2/api');
const { readLogsReverse } = require('../utils/read-logs.util');
const { getCurrentGitBranch, getCurrentGitCommit, gitPull, gitClone } = require('../utils/git.util');
const { getEnvFileRawContent, getEnvFileRawBackupContent, parseEnv, setEnvDataSyncAndBackup } = require('../utils/env.util');
const { formatBytes } = require('../utils/format.util');
const AnsiConverter = require('ansi-to-html');
const ansiConvert = new AnsiConverter();
const fs = require('fs');
const path = require("path");
const si = require('systeminformation');

/**
 * Get all apps
 */
const getAllApps = async (ctx) => {
    try {
        const apps = await listApps();
        const node = await nodeInfo();

        let stoppedCount = 0;
        let erroredCount = 0;
        let onlineCount = 0;

        if (apps) {
            apps.forEach(app => {
                if (app.status === 'stopped') {
                    stoppedCount++;
                } else if (app.status === 'online') {
                    onlineCount++;
                } else if (app.status === 'errored') {
                    erroredCount++;
                }
            });
        }

        ctx.body = {
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
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get dashboard data (apps + server info)
 */
const getDashboard = async (ctx) => {
    try {
        const apps = await listApps();
        const node = await nodeInfo();
        const username = ctx.session?.username || null;
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
            const cpu = await si.currentLoad();
            const cpuInfo = await si.cpu();
            const mem = await si.mem();
            const os = await si.osInfo();
            const disk = await si.fsSize();
            const time = await si.time();
            const networks = await si.networkInterfaces();
            let network = networks.filter(network => network.default);

            serverinfo = {
                cpuInfo: `${cpuInfo.manufacturer} ${cpuInfo.brand} ${cpuInfo.speed} GHz ${cpuInfo.cores} cores.`,
                currentCPU: cpu.currentLoad.toFixed(2),
                memtotal: formatBytes(mem.total),
                memfree: formatBytes(mem.free),
                memused: formatBytes(mem.used),
                memavailable: formatBytes(mem.available),
                memPercent: (mem.used * 100 / mem.total).toFixed(2),
                osinfo: os.platform + ' ' + os.release + ' | Hostname : ' + os.hostname + ' | IP : ' + (network[0]?.ip4 || 'N/A'),
                diskfs: disk[0]?.fs || '',
                diskTotal: formatBytes(disk[0]?.size || 0),
                diskUsed: formatBytes(disk[0]?.used || 0),
                diskAvail: formatBytes(disk[0]?.available || 0),
                diskPercent: disk[0] ? (disk[0].used * 100 / disk[0].size).toFixed(2) : '0',
                diskinfo: 'Drive : ' + (disk[0]?.fs || '') + ' | Total : ' + formatBytes(disk[0]?.size || 0) + ' | Used : ' + formatBytes(disk[0]?.used || 0) + ' | Available : ' + formatBytes(disk[0]?.available || 0),
                timeinfo: new Date(time.current) + " " + time.timezoneName
            };
            isWindows = (os.platform).toLowerCase().includes('windows');
        } catch (e) {
            console.log(e);
        }

        ctx.body = {
            success: true,
            data: {
                apps,
                serverinfo,
                username,
                isWindows,
                stoppedCount,
                onlineCount,
                erroredCount,
                cwd,
                node
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get single app details
 */
const getApp = async (ctx) => {
    try {
        const { appName } = ctx.params;
        let app = await describeApp(appName);

        if (!app) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'App not found'
            };
            return;
        }

        let networks = await si.networkInterfaces();
        let os = await si.osInfo();
        let isWindows = (os.platform).toLowerCase().includes('windows');
        let portHTTP = '';
        let portHTTPS = '';

        if ((app.name).toString().indexOf(':') !== -1) {
            portHTTP = (app.name).toString().split(':')[1];
            if (portHTTP.indexOf(',') !== -1) {
                portHTTP = portHTTP.split(',')[0];
                portHTTPS = portHTTP.split(',')[1];
            }
        }

        let network = networks.filter(network => network.default);
        let baseUrl = network[0]?.ip4 || 'localhost';
        app.app_base_url = baseUrl;
        app.port_http = portHTTP;
        app.port_https = portHTTPS;
        app.git_branch = await getCurrentGitBranch(app.pm2_env_cwd);
        app.git_commit = await getCurrentGitCommit(app.pm2_env_cwd);
        app.env_file_raw = await getEnvFileRawContent(app.pm2_env_cwd);
        app.env_file_raw_backup = await getEnvFileRawBackupContent(app.pm2_env_cwd);

        const stdout = await readLogsReverse({ filePath: app.pm_out_log_path });
        const stderr = await readLogsReverse({ filePath: app.pm_err_log_path });
        let customlog = null;
        let custom_log_path = app.pm2_env_cwd + '\\logs\\';
        let log_path = "";

        stdout.lines = stdout.lines.map(log => {
            return ansiConvert.toHtml(log);
        }).join('<br/>');

        stderr.lines = stderr.lines.map(log => {
            return ansiConvert.toHtml(log);
        }).join('<br/>');

        if (fs.existsSync(custom_log_path)) {
            log_path = fs.readdirSync(custom_log_path)
                .filter((file) => fs.lstatSync(path.join(custom_log_path, file)).isFile())
                .map((file) => ({ file, mtime: fs.lstatSync(path.join(custom_log_path, file)).mtime }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            if (log_path[0]) {
                customlog = await readLogsReverse({ filePath: custom_log_path + log_path[0].file });
                customlog.lines = customlog.lines.map(log => {
                    return ansiConvert.toHtml(log);
                }).join('<br/>');
            }
        }

        ctx.body = {
            success: true,
            data: {
                app,
                logs: {
                    stdout,
                    stderr,
                    customlog
                },
                isWindows,
                username: ctx.session?.username || null
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get app logs
 */
const getAppLogs = async (ctx) => {
    try {
        const { appName, logType } = ctx.params;
        const { nextKey } = ctx.query;

        if (logType !== 'stdout' && logType !== 'stderr') {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Log Type must be stdout or stderr'
            };
            return;
        }

        const app = await describeApp(appName);
        if (!app) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'App not found'
            };
            return;
        }

        const filePath = logType === 'stdout' ? app.pm_out_log_path : app.pm_err_log_path;
        let logs = await readLogsReverse({ filePath, nextKey });
        logs.lines = logs.lines.map(log => {
            return ansiConvert.toHtml(log);
        }).join('<br/>');

        ctx.body = {
            success: true,
            data: {
                logs
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Reload app
 */
const reloadAppAction = async (ctx) => {
    try {
        const { appName } = ctx.params;
        const apps = await reloadApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            ctx.body = {
                success: true,
                message: `App ${appName} reloaded successfully`
            };
        } else {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Failed to reload app'
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Restart app
 */
const restartAppAction = async (ctx) => {
    try {
        const { appName } = ctx.params;
        const apps = await restartApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            ctx.body = {
                success: true,
                message: `App ${appName} restarted successfully`
            };
        } else {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Failed to restart app'
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Stop app
 */
const stopAppAction = async (ctx) => {
    try {
        const { appName } = ctx.params;
        const apps = await stopApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            ctx.body = {
                success: true,
                message: `App ${appName} stopped successfully`
            };
        } else {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Failed to stop app'
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Flush app logs
 */
const flushAppLogs = async (ctx) => {
    try {
        const { appName } = ctx.params;
        await flushApp(appName);

        ctx.body = {
            success: true,
            message: `Logs for ${appName} flushed successfully`
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Update app environment file
 */
const updateAppEnv = async (ctx) => {
    try {
        const { appName } = ctx.params;
        const { env_content } = ctx.request.body;

        if (!env_content) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'env_content is required'
            };
            return;
        }

        const app = await describeApp(appName);
        if (!app) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'App not found'
            };
            return;
        }

        const envContent = await parseEnv(env_content);
        await setEnvDataSyncAndBackup(app.pm2_env_cwd, appName, envContent);

        ctx.body = {
            success: true,
            message: `Environment file for ${appName} updated successfully`
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete app
 */
const deleteAppAction = async (ctx) => {
    try {
        const { appName } = ctx.params;
        const apps = await deleteApp(appName);

        if (Array.isArray(apps) && apps.length > 0) {
            ctx.body = {
                success: true,
                message: `App ${appName} deleted successfully`
            };
        } else {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Failed to delete app'
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Restart app with new name
 */
const restartAppWithRenameAction = async (ctx) => {
    try {
        const { appName } = ctx.params;
        const { newAppName, nodeArgs } = ctx.request.body;

        if (!newAppName) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'newAppName is required'
            };
            return;
        }

        const app = await describeApp(appName);
        if (!app) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'App not found'
            };
            return;
        }

        const apps = await restartAppWithRename(appName, newAppName, app.exec_path, app.pm2_env_cwd, nodeArgs);

        if (Array.isArray(apps) && apps.length > 0) {
            ctx.body = {
                success: true,
                message: `App restarted successfully with new name: ${newAppName}`
            };
        } else {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Failed to restart app with new name'
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Git pull for app
 */
const gitPullApp = async (ctx) => {
    try {
        const { appName } = ctx.params;
        const { username, password, branch = 'master' } = ctx.request.body;

        if (!username || !password) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'username and password are required'
            };
            return;
        }

        const app = await describeApp(appName);
        if (!app) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'App not found'
            };
            return;
        }

        await gitPull(appName, app.pm2_env_cwd, username, password, branch);

        ctx.body = {
            success: true,
            message: `Git pull for ${appName} completed`
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
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
