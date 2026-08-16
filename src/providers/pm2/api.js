const { safeExecFile } = require('../../utils/exec.util');
const { cached } = require('../../utils/cache.util');
const { bytesToSize, timeSince } = require('./ux.helper');

const PM2_BIN = 'pm2';

// `pm2 jlist` embeds each app's full environment, so the payload grows fast.
// Default execFile maxBuffer (1 MB) is not enough once a handful of apps run.
const JLIST_MAX_BUFFER = 10 * 1024 * 1024;

// Process identifiers reaching PM2 come from HTTP params — keep the same shape
// the controllers validate (alphanumeric, _ . , : -) or a plain pm_id.
const PROCESS_RE = /^[A-Za-z0-9_.,:\-]{1,128}$/;

function assertProcess(process) {
    const id = typeof process === 'number' ? String(process) : process;
    if (typeof id !== 'string' || !PROCESS_RE.test(id)) {
        throw new Error('Invalid PM2 process identifier');
    }
    return id;
}

async function pm2Cli(args, options = {}) {
    return safeExecFile(PM2_BIN, args, options);
}

// `pm2 jlist` prints JSON on stdout, but PM2 can prepend banner/daemon-spawn
// noise on first connect — slice to the outermost array before parsing.
async function jlist() {
    const stdout = await pm2Cli(['jlist'], { maxBuffer: JLIST_MAX_BUFFER });
    const start = stdout.indexOf('[');
    const end = stdout.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) {
        throw new Error('Unexpected output from `pm2 jlist`');
    }
    const apps = JSON.parse(stdout.slice(start, end + 1));
    return Array.isArray(apps) ? apps : [];
}

// Spawning `pm2 jlist` costs well over a second, and a single request often needs it more
// than once (describe + list, or list + action). A short TTL collapses those into one spawn
// and makes back-to-back refreshes instant; every mutation invalidates it right after.
const jlistCached = cached(jlist, { freshMs: 1000, staleMs: 8000 });
const invalidateApps = () => jlistCached.invalidate();

async function listApps() {
    const apps = await jlistCached();
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
}

async function describeApp(appName) {
    const name = assertProcess(appName);
    // `pm2 describe` only renders a human table, so read the same data from jlist.
    const apps = await jlistCached();
    const app = apps.find(a => a.name === name || String(a.pm_id) === name);
    if (!app) return null;
    return {
        name: app.name,
        status: app.pm2_env.status,
        cpu: app.monit.cpu,
        memory: app.monit.memory,
        uptime: timeSince(app.pm2_env.pm_uptime),
        pm_id: app.pm_id,
        pm_out_log_path: app.pm2_env.pm_out_log_path,
        pm_err_log_path: app.pm2_env.pm_err_log_path,
        pm2_env_cwd: app.pm2_env.pm_cwd,
        project_path: app.pm2_env.pm_cwd,
        exec_path: app.pm2_env.pm_exec_path,
        // ecosystem `env_file` — may be relative to pm_cwd, resolved by env.util
        env_file: app.pm2_env.env_file || null,
        node_version: app.pm2_env.node_version,
        node_args: app.pm2_env.node_args,
        restart_time: app.pm2_env.restart_time,
        restarts: app.pm2_env.restart_time,
        env: (process.env.APP_ENV || 'production').toUpperCase()
    };
}

// The CLI's own rendering of `pm2 describe` — a human-readable table that the UI shows
// verbatim, unlike describeApp() which reads the same facts out of jlist as fields.
async function describeAppRaw(appName) {
    const name = assertProcess(appName);
    return pm2Cli(['describe', name]);
}

// Callers treat a non-empty array as success — the CLI signals failure by a
// non-zero exit code, which safeExecFile turns into a throw.
async function runAction(action, process) {
    const target = assertProcess(process);
    console.log(`pm2 ${action} : ${target}`);
    await pm2Cli([action, target]);
    invalidateApps();
    return [{ name: target }];
}

async function reloadApp(process) {
    return runAction('reload', process);
}

async function stopApp(process) {
    return runAction('stop', process);
}

async function flushApp(process) {
    return runAction('flush', process);
}

async function restartApp(process) {
    return runAction('restart', process);
}

// `pm2 reset` zeroes the counters PM2 keeps about a process (restart count, uptime);
// the process itself keeps running untouched.
async function resetApp(process) {
    return runAction('reset', process);
}

async function deleteApp(process) {
    return runAction('delete', process);
}

async function pm2Save() {
    console.log('pm2 save');
    const pm2SaveStatus = { status: null, msg: null };
    try {
        await pm2Cli(['save']);
        pm2SaveStatus.status = 'success';
        pm2SaveStatus.msg = 'pm2 save successfully.';
    } catch (err) {
        pm2SaveStatus.status = 'error';
        pm2SaveStatus.msg = err.message;
    }
    return pm2SaveStatus;
}

async function restartAppWithRename(oldName, newName, scriptPath, cwd, nodeArgs) {
    const from = assertProcess(oldName);
    const to = assertProcess(newName);
    console.log(`pm2 restart with rename: ${from} -> ${to}`);

    await pm2Cli(['delete', from]);

    const startArgs = [
        'start', scriptPath,
        '--name', to,
        '--log-date-format', 'YYYY-MM-DD HH:mm:ss'
    ];
    if (nodeArgs && nodeArgs.trim()) {
        startArgs.push('--node-args', nodeArgs.trim());
    }
    await pm2Cli(startArgs, { cwd });
    invalidateApps();

    await pm2Save();

    return [{ name: to }];
}

// The node binary cannot change under a running process — resolve it once.
const nodeInfo = cached(async () => {
    const stdout = await safeExecFile('node', ['-v']);
    return { node: stdout.trim() };
}, { freshMs: Infinity });

module.exports = {
    invalidateApps,
    listApps,
    describeApp,
    describeAppRaw,
    reloadApp,
    stopApp,
    restartApp,
    resetApp,
    flushApp,
    deleteApp,
    restartAppWithRename,
    pm2Save,
    nodeInfo
};
