const pm2 = require('pm2');
const { promisify } = require('util');
const { exec } = require('child_process');
const { bytesToSize, timeSince } = require('./ux.helper');

const execAsync = promisify(exec);

const pm2ConnectAsync = promisify(pm2.connect.bind(pm2));
const pm2ListAsync    = promisify(pm2.list.bind(pm2));
const pm2DescribeAsync= promisify(pm2.describe.bind(pm2));
const pm2ReloadAsync  = promisify(pm2.reload.bind(pm2));
const pm2RestartAsync = promisify(pm2.restart.bind(pm2));
const pm2StopAsync    = promisify(pm2.stop.bind(pm2));
const pm2DeleteAsync  = promisify(pm2.delete.bind(pm2));
const pm2StartAsync   = promisify(pm2.start.bind(pm2));
const pm2FlushAsync   = promisify(pm2.flush.bind(pm2));
const pm2DumpAsync    = promisify(pm2.dump.bind(pm2));

// Serial queue — ensures only one PM2 connect/disconnect cycle runs at a time.
// Concurrent calls were causing "Cannot read properties of null (reading 'sock')"
// inside PM2's Client.js when disconnect raced against a pending connect callback.
let _pm2Queue = Promise.resolve();

function withPM2(fn) {
    const task = _pm2Queue.then(async () => {
        await pm2ConnectAsync();
        try {
            return await fn();
        } finally {
            pm2.disconnect();
        }
    });
    // Swallow the error on the queue tail so one failure does not block future calls.
    _pm2Queue = task.catch(() => {});
    return task;
}

async function listApps() {
    return withPM2(async () => {
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
            env: (process.env.APP_ENV || 'production').toUpperCase()
        }));
    });
}

async function describeApp(appName) {
    return withPM2(async () => {
        const apps = await pm2DescribeAsync(appName);
        if (!Array.isArray(apps) || apps.length === 0) return null;
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
            env: (process.env.APP_ENV || 'production').toUpperCase()
        };
    });
}

async function reloadApp(process) {
    console.log('pm2 reload : ' + process);
    return withPM2(() => pm2ReloadAsync(process));
}

async function stopApp(process) {
    console.log('pm2 stop : ' + process);
    return withPM2(() => pm2StopAsync(process));
}

async function flushApp(process) {
    console.log('pm2 flush : ' + process);
    return withPM2(() => pm2FlushAsync(process));
}

async function restartApp(process) {
    console.log('pm2 restart : ' + process);
    return withPM2(() => pm2RestartAsync(process));
}

async function pm2Save() {
    console.log('pm2 save');
    const pm2SaveStatus = { status: null, msg: null };
    try {
        // Use PM2's JS API (dump) instead of shelling out to `pm2 save`.
        // Shelling out triggered DEP0190 on Windows via PM2's internal npm.cmd spawn.
        await withPM2(() => pm2DumpAsync());
        pm2SaveStatus.status = 'success';
        pm2SaveStatus.msg = 'pm2 save successfully.';
    } catch (err) {
        pm2SaveStatus.status = 'error';
        pm2SaveStatus.msg = err.message;
    }
    return pm2SaveStatus;
}

async function deleteApp(process) {
    console.log('pm2 delete : ' + process);
    return withPM2(() => pm2DeleteAsync(process));
}

async function restartAppWithRename(oldName, newName, scriptPath, cwd, nodeArgs) {
    console.log(`pm2 restart with rename: ${oldName} -> ${newName}`);

    await withPM2(async () => {
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
    });

    // Save outside the withPM2 block so it goes through the queue as its own operation
    await pm2Save();

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
