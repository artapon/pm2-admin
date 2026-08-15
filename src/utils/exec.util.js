const { promisify } = require('util');
const { exec, execFile } = require('child_process');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

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

// Safe exec for commands with user-controlled arguments.
// On Windows, .cmd shims (git.cmd, pm2.cmd, …) cannot be invoked by execFile
// directly without shell:true — but shell:true + args triggers DEP0190 because
// Node concatenates the array into the shell string without escaping.
// Fix: delegate to cmd.exe /c with shell:false; args stay as a proper vector.
async function safeExecFile(cmd, args, options = {}) {
    const finalCmd  = IS_WINDOWS ? 'cmd.exe' : cmd;
    const finalArgs = IS_WINDOWS ? ['/c', cmd, ...args] : args;
    try {
        // shell: false is placed last so caller options cannot accidentally re-enable it
        const { stdout, stderr } = await execFileAsync(finalCmd, finalArgs, { windowsHide: true, ...options, shell: false });
        if (stderr) console.warn('⚠️ STDERR:', stderr);
        return stdout;
    } catch (err) {
        console.error('❌ EXEC ERROR:', err.message);
        throw new Error(err.stderr || err.message);
    }
}

module.exports = {
    IS_WINDOWS,
    safeExec,
    safeExecFile
};
