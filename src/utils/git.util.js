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

// A remote keeps the credentials it was cloned with (https://user:pass@host). Injecting a
// fresh pair on top would produce two userinfo sections and an unusable URL.
const stripCredentials = (url) => url.replace(/^(https?:\/\/)[^@\/]*@/i, '$1');

// Without this git happily blocks forever on a credential prompt — a terminal one on Linux,
// a Credential Manager dialog on Windows — with nobody there to answer it.
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
const GIT_PULL_TIMEOUT_MS = 2 * 60 * 1000;

// Local modifications make git refuse to merge or switch branches, so this is what turns
// a blocked operation into one that goes through. The changes stay in the stash list —
// `git stash pop` in the app folder brings them back.
const stashLocalChanges = async (appName, gitOpts) => {
    console.log(appName + ' : git stash push');
    const stashOut = await safeExecFile(
        'git',
        ['stash', 'push', '--include-untracked', '-m', `pm2-admin ${new Date().toISOString()}`],
        gitOpts
    );
    return {
        // git exits 0 either way, so its wording is the only signal of what happened
        stashed: !/no local changes/i.test(stashOut),
        output: stashOut.trim() || 'No local changes to save'
    };
};

const gitPull = async (appName, cwd, username, password, branch, { stash = false } = {}) => {
    if (branch && !BRANCH_RE.test(branch)) {
        throw new Error('Invalid branch name');
    }

    const gitOpts = { cwd, env: GIT_ENV, timeout: GIT_PULL_TIMEOUT_MS };
    const targetBranch = branch || 'master';
    const steps = [];
    let stashed = false;

    try {
        if (stash) {
            const result = await stashLocalChanges(appName, gitOpts);
            stashed = result.stashed;
            steps.push(result.output);
        }

        const remoteOut = await safeExecFile('git', ['config', '--get', 'remote.origin.url'], gitOpts);
        const remote = stripCredentials(remoteOut.trim());

        // With no credentials supplied, pull through the configured remote — it already
        // carries whatever authentication the clone was set up with
        let target = 'origin';
        if (username && password) {
            if (!/^https:\/\//i.test(remote)) {
                throw new Error('Credentials can only be used with an https remote');
            }
            target = remote.replace(/^https:\/\//i, `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@`);
        }

        console.log(appName + ' : git pull ' + targetBranch);
        const stdout = await safeExecFile('git', ['pull', target, targetBranch], gitOpts);
        const output = redact(stdout).trim();
        console.log(appName + ' : ' + output);
        steps.push(output);

        return { output: steps.filter(Boolean).join('\n'), stashed };
    } catch (err) {
        // Never surface err.message directly — it could contain the credential-bearing remote
        const message = redact(err.message);
        console.error(appName + ' gitPull error:', message);
        const error = new Error(message);
        error.stashed = stashed;
        throw error;
    }
};

// Branches a remote gained since the last fetch are invisible locally, so the caller can
// ask for a refresh first. It is best effort: a remote that needs credentials this process
// does not have must not take the whole listing down with it.
const listBranches = async (appName, cwd, { fetch = false } = {}) => {
    const gitOpts = { cwd, env: GIT_ENV, timeout: GIT_PULL_TIMEOUT_MS };
    let fetchError = null;

    if (fetch) {
        try {
            console.log(appName + ' : git fetch --prune');
            await safeExecFile('git', ['fetch', '--prune', 'origin'], gitOpts);
        } catch (err) {
            fetchError = redact(err.message);
            console.warn(appName + ' git fetch failed:', fetchError);
        }
    }

    const remotesOut = await safeExecFile('git', ['remote'], gitOpts);
    const remotes = remotesOut.split('\n').map(r => r.trim()).filter(Boolean);

    // Full refnames, not %(refname:short): the short form of refs/remotes/origin/HEAD is
    // bare `origin`, which is indistinguishable from a local branch of that name
    const refsOut = await safeExecFile(
        'git',
        ['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes'],
        gitOpts
    );

    const branches = new Map();
    for (const ref of refsOut.split('\n').map(l => l.trim()).filter(Boolean)) {
        let name = null;
        let isRemote = false;

        if (ref.startsWith('refs/heads/')) {
            name = ref.slice('refs/heads/'.length);
        } else if (ref.startsWith('refs/remotes/')) {
            const rest = ref.slice('refs/remotes/'.length);
            const remote = remotes.find(r => rest.startsWith(`${r}/`));
            if (!remote) continue;
            // A remote-tracking ref is offered under its short name: `git checkout feature`
            // creates the local tracking branch when exactly one remote carries it
            name = rest.slice(remote.length + 1);
            isRemote = true;
            // origin/HEAD is a symbolic pointer at the default branch, not a branch itself
            if (name === 'HEAD') continue;
        }

        if (!name || !BRANCH_RE.test(name)) continue;

        const existing = branches.get(name);
        if (existing) {
            if (isRemote) existing.remote = true; else existing.local = true;
        } else {
            branches.set(name, { name, local: !isRemote, remote: isRemote });
        }
    }

    const current = await getCurrentGitBranch(cwd);
    const list = [...branches.values()]
        .map(b => ({ ...b, current: b.name === current }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return { current, branches: list, fetchError };
};

const checkoutBranch = async (appName, cwd, branch, { stash = false } = {}) => {
    if (!branch || !BRANCH_RE.test(branch)) {
        throw new Error('Invalid branch name');
    }

    const gitOpts = { cwd, env: GIT_ENV, timeout: GIT_PULL_TIMEOUT_MS };
    const steps = [];
    let stashed = false;

    try {
        // Only branches git already knows about — otherwise a checkout would quietly
        // create a new branch from the current HEAD instead of switching to real code
        const { branches } = await listBranches(appName, cwd);
        if (!branches.some(b => b.name === branch)) {
            throw new Error(`Unknown branch: ${branch}`);
        }

        if (stash) {
            const result = await stashLocalChanges(appName, gitOpts);
            stashed = result.stashed;
            steps.push(result.output);
        }

        console.log(appName + ' : git checkout ' + branch);
        const stdout = await safeExecFile('git', ['checkout', branch], gitOpts);
        steps.push(redact(stdout).trim() || `Switched to branch '${branch}'`);

        const commit = await getCurrentGitCommit(cwd);
        return { output: steps.filter(Boolean).join('\n'), stashed, branch, commit };
    } catch (err) {
        const message = redact(err.message);
        console.error(appName + ' checkoutBranch error:', message);
        const error = new Error(message);
        error.stashed = stashed;
        throw error;
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
    listBranches,
    checkoutBranch,
    gitClone
};
