const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const { IS_WINDOWS, safeExecFile } = require('./exec.util');

const execFileAsync = promisify(execFile);

// Semver the way nvm reports it — the leading `v` is optional on input, never on output
const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)$/;

const EXEC_OPTS = { maxBuffer: 10 * 1024 * 1024 };
// An install is a download plus an extract; the default 2 min execFile timeout is short.
// On Windows it can also stall behind a UAC prompt, so it must not wait forever.
const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;
const LIST_TIMEOUT_MS = 60 * 1000;

// nvm-windows lives in NVM_HOME; nvm.sh in NVM_DIR
const nvmRoot = () => IS_WINDOWS
    ? (process.env.NVM_HOME || 'C:\\nvm')
    : (process.env.NVM_DIR || path.join(os.homedir(), '.nvm'));

// nvm-windows keeps `C:\nvm\v18.20.0`; nvm.sh keeps `~/.nvm/versions/node/v18.20.0`
const versionsDir = () => IS_WINDOWS ? nvmRoot() : path.join(nvmRoot(), 'versions', 'node');

const nvmBinary = () => path.join(nvmRoot(), IS_WINDOWS ? 'nvm.exe' : 'nvm.sh');

function interpreterFor(versionDir) {
    if (!IS_WINDOWS) return path.join(versionDir, 'bin', 'node');
    // A version installed for both architectures keeps node32.exe/node64.exe beside
    // the node.exe that `nvm use` swaps in
    for (const exe of ['node.exe', 'node64.exe', 'node32.exe']) {
        const candidate = path.join(versionDir, exe);
        if (fs.existsSync(candidate)) return candidate;
    }
    return path.join(versionDir, 'node.exe');
}

const shellQuote = (arg) => `'${String(arg).replace(/'/g, `'\\''`)}'`;

async function runNvm(args, options = {}) {
    if (IS_WINDOWS) return safeExecFile('nvm', args, { ...EXEC_OPTS, ...options });
    // On POSIX nvm is a shell function, not a binary — it exists only after nvm.sh
    // has been sourced, so the call has to go through bash. Every argument is quoted,
    // so nothing in it can escape into the script.
    const script = `. ${shellQuote(nvmBinary())} >/dev/null 2>&1 && nvm ${args.map(shellQuote).join(' ')}`;
    const { stdout } = await execFileAsync('bash', ['-lc', script], { windowsHide: true, ...EXEC_OPTS, ...options });
    return stdout;
}

const firstLine = (out) => out.split('\n').map(l => l.trim()).find(Boolean) || '';

const compareDesc = (a, b) => {
    const [aMaj, aMin, aPat] = a.split('.').map(Number);
    const [bMaj, bMin, bPat] = b.split('.').map(Number);
    return (bMaj - aMaj) || (bMin - aMin) || (bPat - aPat);
};

async function readNvmVersion() {
    // nvm-windows answers `nvm version`; nvm.sh answers `nvm --version`
    // (`nvm version` there reports the active *node* version instead)
    const out = await runNvm([IS_WINDOWS ? 'version' : '--version'], { timeout: LIST_TIMEOUT_MS });
    const version = firstLine(out);
    return /^\d+\.\d+\.\d+/.test(version) ? version : null;
}

async function readCurrentVersion() {
    try {
        if (IS_WINDOWS) {
            // `nvm list` marks the active version with a leading asterisk
            const out = await runNvm(['list'], { timeout: LIST_TIMEOUT_MS });
            const match = out.match(/^\s*\*\s*v?(\d+\.\d+\.\d+)/m);
            return match ? match[1] : null;
        }
        const out = await runNvm(['current'], { timeout: LIST_TIMEOUT_MS });
        const match = out.match(/v?(\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

// The version folders are the source of truth for the interpreter paths — parsing
// them out of `nvm list` would only give version numbers, not the binary location.
function scanInstalledVersions() {
    let entries;
    try {
        entries = fs.readdirSync(versionsDir(), { withFileTypes: true });
    } catch {
        return [];
    }
    return entries
        .filter(entry => entry.isDirectory() && VERSION_RE.test(entry.name))
        .map(entry => {
            const dir = path.join(versionsDir(), entry.name);
            return {
                version: entry.name.replace(/^v/, ''),
                path: dir,
                interpreter: interpreterFor(dir)
            };
        })
        // A half-removed version leaves the folder without a binary — it is not usable
        // as an interpreter, so it does not belong in the list
        .filter(item => fs.existsSync(item.interpreter))
        .sort((a, b) => compareDesc(a.version, b.version));
}

async function getNvmStatus() {
    let nvmVersion = null;
    let error = null;
    try {
        nvmVersion = await readNvmVersion();
    } catch (err) {
        error = err.message;
    }

    // nvm may be installed but off PATH for the user running this process — the
    // binary sitting in NVM_HOME/NVM_DIR still proves it is there
    const installed = Boolean(nvmVersion) || fs.existsSync(nvmBinary());

    const versions = installed ? scanInstalledVersions() : [];
    const current = installed ? await readCurrentVersion() : null;
    versions.forEach(item => { item.current = item.version === current; });

    return {
        installed,
        nvmVersion,
        root: nvmRoot(),
        current,
        versions,
        isWindows: IS_WINDOWS,
        error: installed ? null : error
    };
}

async function listAvailableVersions() {
    const out = await runNvm(
        IS_WINDOWS ? ['list', 'available'] : ['ls-remote', '--no-colors'],
        { timeout: LIST_TIMEOUT_MS }
    );
    const found = new Map();

    if (IS_WINDOWS) {
        // A four-column table: |  CURRENT  |  LTS  |  OLD STABLE  |  OLD UNSTABLE |
        const lines = out.split('\n').filter(line => line.includes('|'));
        const header = lines.find(line => /LTS/i.test(line));
        const ltsColumn = header ? header.split('|').findIndex(col => /^\s*LTS\s*$/i.test(col)) : -1;
        for (const line of lines) {
            line.split('|').forEach((col, index) => {
                const match = col.trim().match(/^(\d+\.\d+\.\d+)$/);
                if (match && !found.has(match[1])) {
                    found.set(match[1], { version: match[1], lts: index === ltsColumn });
                }
            });
        }
    } else {
        for (const line of out.split('\n')) {
            const match = line.match(/v(\d+\.\d+\.\d+)/);
            if (match && !found.has(match[1])) {
                found.set(match[1], { version: match[1], lts: /lts/i.test(line) });
            }
        }
    }

    return [...found.values()].sort((a, b) => compareDesc(a.version, b.version));
}

// Returns the normalised x.y.z form, or null when the input is not a version at all
function parseVersion(rawVersion) {
    const match = VERSION_RE.exec(String(rawVersion || '').trim());
    return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

async function installNodeVersion(rawVersion) {
    const version = parseVersion(rawVersion);
    if (!version) throw new Error('Invalid Node.js version — expected x.y.z');

    const output = await runNvm(['install', version], { timeout: INSTALL_TIMEOUT_MS });

    // nvm-windows reports an unknown version on stdout and still exits 0, so the
    // exit code alone does not tell us whether anything was installed
    const installed = scanInstalledVersions().some(item => item.version === version);
    if (!installed) {
        throw new Error(firstLine(output) || `Node.js ${version} was not installed`);
    }

    return { version, output: output.trim() };
}

module.exports = {
    parseVersion,
    getNvmStatus,
    listAvailableVersions,
    installNodeVersion
};
