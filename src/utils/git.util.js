const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');
const { parseEnv, setEnvDataSync } = require('../utils/env.util');

async function safeExec(cmd, cwd) {
    try {
        const { stdout, stderr } = await exec(cmd, { cwd });
        if (stderr) {
            console.warn('⚠️ STDERR:', stderr);
        }
        return stdout;
    } catch (err) {
        console.error('❌ EXEC ERROR:', err.message);
        throw new Error(err.stderr || err.message);
    }
}

const getCurrentGitBranch = async (cwd)=>{
    return new Promise((resolve, reject) => {
        exec('git rev-parse --abbrev-ref HEAD', { cwd }, (err, stdout, stderr) => {
            if (!err && typeof stdout === 'string') {
                resolve(stdout.trim())
            }
            resolve(null)
        });
    })
}

const getCurrentGitCommit = async (cwd)=>{
    return new Promise((resolve, reject) => {
        exec('git rev-parse --short HEAD', { cwd }, (err, stdout, stderr) => {
            if (!err && typeof stdout === 'string') {
                resolve(stdout.trim())
            }
            resolve(null)
        });
    })
}

const gitPull = async (appName, cwd, username, password, branch)=>{
    return new Promise((resolve, reject) => {
        exec('git config --get remote.origin.url', { cwd }, (err, stdout, stderr) => {
            if (!err && typeof stdout === 'string') {
                let remote = stdout;
                remote = remote.replace('https://', "").replace("\n", "");
                console.log('Remote : ' + remote);
                remote = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${remote.trim()}`;

                //git stash for clean Local change trust on Repository
                exec('git stash pop', { cwd }, (err, stdout, stderr) => {
                    console.log(appName + ' : git stash pop');
                    //git pull master
                    exec('git pull '+ remote + ' ' + branch, { cwd }, (err, stdout, stderr) => {
                        console.log(appName + ' : git pull '+ branch);
                        if (!err && typeof stdout === 'string') {
                            console.log(appName + ' : ' + stdout.replace("\n", ""));
                            resolve(stdout.trim())
                        } else {
                            console.log(appName + ' : ' + stderr.replace("\n", ""));
                        }
                        resolve(null)
                    });
                });               
            }
            resolve(null)
        });
    })

}

const gitClone = async (gitUrl, gitUsername, gitPassword, tofolder = '', branch = 'master', envContent, appName, startScript) => {
    const cloneStatus = { status: null, msg: null };

    try {
        const repositoryName = gitUrl.split('/').pop().replace('.git', '');
        const cwd = path.resolve(__dirname, '../../..');
        const username = encodeURIComponent(gitUsername);
        const password = encodeURIComponent(gitPassword);
        let cloneUrl = gitUrl.replace("https://", `https://${username}:${password}@`);

        const appDirectory = path.join(cwd, tofolder || repositoryName);

        // 🔥 ป้องกัน error: ถ้าโฟลเดอร์มีอยู่แล้ว ให้ลบก่อน clone
        if (fs.existsSync(appDirectory)) {
            console.log(`⚠️ Directory already exists. Removing ${appDirectory} ...`);
            fs.rmSync(appDirectory, { recursive: true, force: true });
        }

        // 🔥 Git Clone
        console.log(`📥 [${appName}] Cloning ${gitUrl}`);
        await safeExec(`git clone ${cloneUrl} ${tofolder || ''}`, cwd);

        // 🔥 Checkout branch
        console.log(`🌿 [${appName}] Checkout branch: ${branch}`);
        await safeExec(`git checkout ${branch}`, appDirectory);

        // 🔥 Install dependencies
        console.log(`📦 [${appName}] Installing packages...`);
        await safeExec('npm install --no-audit --no-fund', appDirectory);

        // 🔥 Set .env
        envContent = await parseEnv(envContent);
        await setEnvDataSync(appDirectory, envContent);

        // 🔥 PM2 start
        console.log(`🚀 [${appName}] Starting with PM2...`);
        await safeExec(
            `pm2 start ${startScript} --name "${appName}" --log-date-format "YYYY-MM-DD HH:mm:ss" --no-autorestart --max-restarts 0`,
            appDirectory
        );

        // 🔥 PM2 save
        console.log("💾 Saving PM2 process list...");
        await safeExec('pm2 save');
        console.log("💾 PM2 Save");

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
}