const { promisify } = require('util');
const { exec, execFile } = require('child_process');
const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const fs = require('fs');
const path = require('path');
const { parseEnv, setEnvDataSync } = require('../utils/env.util');

const BRANCH_RE = /^[a-zA-Z0-9._\-\/]+$/;
const FOLDER_RE = /^[a-zA-Z0-9._\-]+$/;
const PM2_BIN = 'pm2';

const IS_WINDOWS = process.platform === 'win32';

// Safe exec for commands with no user-controlled input
async function safeExec(cmd, cwd) {
    try {
        const { stdout, stderr } = await execAsync(cmd, { cwd, windowsHide: true, shell: true });
        if (stderr) console.warn('⚠️ STDERR:', stderr);
        return stdout;
    } catch (err) {
        console.error('❌ EXEC ERROR:', err.message);
        throw new Error(err.stderr || err.message);
    }
}

// Safe exec for commands with user-controlled arguments
// shell: true is required on Windows — execFile without shell fails (EINVAL) for .cmd files and PATH resolution
async function safeExecFile(cmd, args, options = {}) {
    try {
        const { stdout, stderr } = await execFileAsync(cmd, args, { windowsHide: true, shell: IS_WINDOWS, ...options });
        if (stderr) console.warn('⚠️ STDERR:', stderr);
        return stdout;
    } catch (err) {
        console.error('❌ EXEC ERROR:', err.message);
        throw new Error(err.stderr || err.message);
    }
}

const getCurrentGitBranch = async (cwd) => {
    try {
        const stdout = await safeExecFile('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
        return stdout.trim();
    } catch {
        return null;
    }
};

const getCurrentGitCommit = async (cwd) => {
    try {
        const stdout = await safeExecFile('git', ['rev-parse', '--short', 'HEAD'], { cwd });
        return stdout.trim();
    } catch {
        return null;
    }
};

const gitPull = async (appName, cwd, username, password, branch) => {
    try {
        if (branch && !BRANCH_RE.test(branch)) {
            throw new Error('Invalid branch name');
        }

        const remoteOut = await safeExecFile('git', ['config', '--get', 'remote.origin.url'], { cwd });
        let remote = remoteOut.replace('https://', '').replace('\n', '').trim();
        remote = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${remote}`;

        console.log(appName + ' : git stash pop');
        await safeExecFile('git', ['stash', 'pop'], { cwd }).catch(() => {});

        const targetBranch = branch || 'master';
        console.log(appName + ' : git pull ' + targetBranch);
        const stdout = await safeExecFile('git', ['pull', remote, targetBranch], { cwd });
        console.log(appName + ' : ' + stdout.replace('\n', ''));
        return stdout.trim();
    } catch (err) {
        console.error(appName + ' gitPull error:', err.message);
        return null;
    }
};

const gitClone = async (gitUrl, gitUsername, gitPassword, tofolder = '', branch = 'master', envContent, appName, startScript) => {
    const cloneStatus = { status: null, msg: null };

    try {
        // Validate inputs
        if (branch && !BRANCH_RE.test(branch)) {
            throw new Error('Invalid branch name');
        }
        if (tofolder && !FOLDER_RE.test(tofolder)) {
            throw new Error('Invalid folder name — only alphanumeric, dots, dashes, underscores allowed');
        }

        const repositoryName = gitUrl.split('/').pop().replace('.git', '');
        const cwd = path.resolve(__dirname, '../../..');
        const username = encodeURIComponent(gitUsername);
        const password = encodeURIComponent(gitPassword);
        const cloneUrl = gitUrl.replace('https://', `https://${username}:${password}@`);

        const appDirectory = path.join(cwd, tofolder || repositoryName);

        // Prevent path traversal
        const resolvedDir = path.resolve(appDirectory);
        const resolvedCwd = path.resolve(cwd);
        if (!resolvedDir.startsWith(resolvedCwd + path.sep) && resolvedDir !== resolvedCwd) {
            throw new Error('Invalid clone target directory');
        }

        if (fs.existsSync(appDirectory)) {
            console.log(`⚠️ Directory already exists. Removing ${appDirectory} ...`);
            fs.rmSync(appDirectory, { recursive: true, force: true });
        }

        console.log(`📥 [${appName}] Cloning ${gitUrl}`);
        const cloneArgs = ['clone', cloneUrl];
        if (tofolder) cloneArgs.push(tofolder);
        await safeExecFile('git', cloneArgs, { cwd });

        console.log(`🌿 [${appName}] Checkout branch: ${branch}`);
        await safeExecFile('git', ['checkout', branch || 'master'], { cwd: appDirectory });

        console.log(`📦 [${appName}] Installing packages...`);
        await safeExec('npm install --no-audit --no-fund', appDirectory);

        envContent = await parseEnv(envContent);
        await setEnvDataSync(appDirectory, envContent);

        console.log(`🚀 [${appName}] Starting with PM2...`);
        await safeExecFile(PM2_BIN, [
            'start', startScript,
            '--name', appName,
            '--log-date-format', 'YYYY-MM-DD HH:mm:ss',
            '--no-autorestart',
            '--max-restarts', '0'
        ], { cwd: appDirectory });

        console.log('💾 Saving PM2 process list...');
        await safeExec('pm2 save', undefined);

        cloneStatus.status = 'success';
        cloneStatus.msg = 'Clone & Start Application successfully.';
        return cloneStatus;
    } catch (err) {
        cloneStatus.status = 'error';
        cloneStatus.msg = err.message;
        return cloneStatus;
    }
};

module.exports = {
    getCurrentGitBranch,
    getCurrentGitCommit,
    gitPull,
    gitClone
};
