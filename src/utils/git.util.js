const fs = require('fs');
const path = require('path');
const { parseEnv, setEnvDataSync } = require('../utils/env.util');
const { safeExec, safeExecFile } = require('../utils/exec.util');

const BRANCH_RE = /^[a-zA-Z0-9._\-\/]+$/;
const FOLDER_RE = /^[a-zA-Z0-9._\-]+$/;
const PM2_BIN = 'pm2';

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

// Strip embedded credentials (e.g. https://user:pass@host) from text before logging
const redact = (s) => typeof s === 'string'
    ? s.replace(/(https?:\/\/)([^\s:@\/]+):([^\s@\/]+)@/gi, '$1***:***@')
    : s;

const gitPull = async (appName, cwd, username, password, branch) => {
    try {
        if (branch && !BRANCH_RE.test(branch)) {
            throw new Error('Invalid branch name');
        }

        const remoteOut = await safeExecFile('git', ['config', '--get', 'remote.origin.url'], { cwd });
        let remoteHost = remoteOut.replace('https://', '').trim();
        const authedRemote = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${remoteHost}`;

        console.log(appName + ' : git stash pop');
        await safeExecFile('git', ['stash', 'pop'], { cwd }).catch(() => {});

        const targetBranch = branch || 'master';
        console.log(appName + ' : git pull ' + targetBranch);
        const stdout = await safeExecFile('git', ['pull', authedRemote, targetBranch], { cwd });
        console.log(appName + ' : ' + redact(stdout).trim());
        return stdout.trim();
    } catch (err) {
        // Never log err.message directly — could contain the credential-bearing remote
        console.error(appName + ' gitPull error:', redact(err.message));
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

        // Only allow https:// git URLs — block file://, ssh://, http:// (downgrade), git://
        if (typeof gitUrl !== 'string' || !/^https:\/\/[^\s'"`$]+$/.test(gitUrl) || gitUrl.length > 1024) {
            throw new Error('Invalid git URL — only https:// allowed');
        }
        if (typeof gitUsername !== 'string' || typeof gitPassword !== 'string' || !gitUsername || !gitPassword) {
            throw new Error('Missing credentials');
        }
        if (gitUsername.length > 200 || gitPassword.length > 500) {
            throw new Error('Credential too long');
        }

        const repositoryName = gitUrl.split('/').pop().replace('.git', '');
        const cwd = path.resolve(__dirname, '../../..');
        const username = encodeURIComponent(gitUsername);
        const password = encodeURIComponent(gitPassword);
        const cloneUrl = gitUrl.replace('https://', `https://${username}:${password}@`);

        const appDirectory = path.join(cwd, tofolder || repositoryName);

        // Defence-in-depth path traversal check using path.relative — rejects any
        // path that resolves outside cwd, regardless of separator/symlinks.
        const resolvedDir = path.resolve(appDirectory);
        const resolvedCwd = path.resolve(cwd);
        const rel = path.relative(resolvedCwd, resolvedDir);
        if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
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
        await safeExecFile(PM2_BIN, ['save']);
        // A new process appeared behind the provider's back — drop the cached jlist.
        require('../providers/pm2/api').invalidateApps();

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
