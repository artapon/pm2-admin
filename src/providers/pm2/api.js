const pm2 = require('pm2');
const { promisify } = require('util');
const { exec } = require('child_process');
const { bytesToSize, timeSince } = require('./ux.helper');

const execAsync = promisify(exec);
const pm2ConnectAsync = promisify(pm2.connect.bind(pm2));
const pm2DisconnectAsync = promisify(pm2.disconnect.bind(pm2));
const pm2ListAsync = promisify(pm2.list.bind(pm2));
const pm2DescribeAsync = promisify(pm2.describe.bind(pm2));
const pm2ReloadAsync = promisify(pm2.reload.bind(pm2));
const pm2RestartAsync = promisify(pm2.restart.bind(pm2));
const pm2StopAsync = promisify(pm2.stop.bind(pm2));
const pm2DeleteAsync = promisify(pm2.delete.bind(pm2));
const pm2StartAsync = promisify(pm2.start.bind(pm2));
const pm2FlushAsync = promisify(pm2.flush.bind(pm2));

async function listApps() {
    await pm2ConnectAsync();
    try {
        const apps = await pm2ListAsync();
        return apps.map(app => ({
            name: app.name,
            status: app.pm2_env.status,
            cpu: app.monit.cpu,
            memory: bytesToSize(app.monit.memory),
            uptime: timeSince(app.pm2_env.pm_uptime),
            pm_id: app.pm_id,
            restarts: app.pm2_env.restart_time,
            node_args: app.pm2_env.node_args,
            env: (process.env.APP_ENV).toUpperCase()
        }));
    } finally {
        pm2.disconnect();
    }
}

async function describeApp(appName) {
    await pm2ConnectAsync();
    try {
        const apps = await pm2DescribeAsync(appName);
        if (Array.isArray(apps) && apps.length > 0) {
            return {
                name: apps[0].name,
                status: apps[0].pm2_env.status,
                cpu: apps[0].monit.cpu,
                memory: apps[0].monit.memory,
                uptime: timeSince(apps[0].pm2_env.pm_uptime),
                pm_id: apps[0].pm_id,
                pm_out_log_path: apps[0].pm2_env.pm_out_log_path,
                pm_err_log_path: apps[0].pm2_env.pm_err_log_path,
                pm2_env_cwd: apps[0].pm2_env.pm_cwd,
                project_path: apps[0].pm2_env.pm_cwd,
                exec_path: apps[0].pm2_env.pm_exec_path,
                node_version: apps[0].pm2_env.node_version,
                node_args: apps[0].pm2_env.node_args,
                restart_time: apps[0].pm2_env.restart_time,
                restarts: apps[0].pm2_env.restart_time,
                env: (process.env.APP_ENV).toUpperCase()
            };
        }
        return null;
    } finally {
        pm2.disconnect();
    }
}

async function reloadApp(process) {
    console.log('pm2 reload : ' + process);
    await pm2ConnectAsync();
    try {
        return await pm2ReloadAsync(process);
    } finally {
        pm2.disconnect();
    }
}

async function stopApp(process) {
    console.log('pm2 stop : ' + process);
    await pm2ConnectAsync();
    try {
        return await pm2StopAsync(process);
    } finally {
        pm2.disconnect();
    }
}

async function flushApp(process) {
    console.log('pm2 flush : ' + process);
    await pm2ConnectAsync();
    try {
        await pm2FlushAsync(process);
    } finally {
        pm2.disconnect();
    }
}

async function restartApp(process) {
    console.log('pm2 restart : ' + process);
    await pm2ConnectAsync();
    try {
        return await pm2RestartAsync(process);
    } finally {
        pm2.disconnect();
    }
}

async function pm2Save() {
    console.log('pm2 save');
    const pm2SaveStatus = { status: null, msg: null };
    try {
        const { stdout } = await execAsync('pm2 save', { windowsHide: true, shell: true });
        console.log(stdout);
        pm2SaveStatus.status = 'success';
        pm2SaveStatus.msg = 'pm2 save successfully.';
    } catch (err) {
        pm2SaveStatus.status = 'error';
        pm2SaveStatus.msg = err.stderr || err.message;
    }
    return pm2SaveStatus;
}

async function deleteApp(process) {
    console.log('pm2 delete : ' + process);
    await pm2ConnectAsync();
    try {
        return await pm2DeleteAsync(process);
    } finally {
        pm2.disconnect();
    }
}

async function restartAppWithRename(oldName, newName, scriptPath, cwd, nodeArgs) {
    console.log(`pm2 restart with rename: ${oldName} -> ${newName}`);

    await pm2ConnectAsync();
    try {
        await pm2DeleteAsync(oldName);

        const startOpts = {
            script: scriptPath,
            name: newName,
            cwd,
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        };
        if (nodeArgs && nodeArgs.trim()) {
            startOpts.node_args = nodeArgs.trim();
        }
        await pm2StartAsync(startOpts);
    } finally {
        pm2.disconnect();
    }

    try {
        await execAsync('pm2 save', { windowsHide: true, shell: true });
        console.log('pm2 save completed');
    } catch (saveErr) {
        console.error('pm2 save failed:', saveErr.stderr || saveErr.message);
    }

    return [{ name: newName }];
}

async function nodeInfo() {
    const { stdout } = await execAsync('node -v', { windowsHide: true, shell: true });
    return { node: stdout.trim() };
}

module.exports = {
    listApps,
    describeApp,
    reloadApp,
    stopApp,
    restartApp,
    flushApp,
    deleteApp,
    restartAppWithRename,
    pm2Save,
    nodeInfo
};
