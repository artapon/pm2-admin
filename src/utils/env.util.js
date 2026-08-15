const fs = require('fs');
const envfile = require('envfile')
const path = require('path')

// PM2 apps started from an ecosystem file usually share one cwd while each app keeps
// its own .env in a sub folder (env_file: './centrix-hl7/.env'), so `<cwd>/.env` is
// often the wrong file — or no file at all. Resolution order:
//   1. pm2_env.env_file (relative paths are resolved against pm_cwd, like PM2 does)
//   2. <cwd>/.env when it exists
//   3. <dir of the script>/.env when it exists (ecosystem apps without env_file)
//   4. <cwd>/.env as the default target for writes
const resolveEnvFilePath = ({ cwd, execPath, envFile } = {}) => {
    if (envFile) return path.resolve(cwd || '.', envFile)
    const candidates = []
    if (cwd) candidates.push(path.join(cwd, '.env'))
    if (execPath) candidates.push(path.join(path.dirname(execPath), '.env'))
    const found = candidates.find(p => fs.existsSync(p))
    return found || candidates[0] || null
}

// The backup lives next to the env file it mirrors — `.env` -> `.env.backup`
const backupPathFor = (envPath) => envPath ? envPath + '.backup' : null

const readFileOrNull = async (filePath) => {
    if (!filePath) return null
    return new Promise((resolve) => {
        fs.readFile(filePath, 'utf-8', function(err, data){
            resolve(err ? null : data)
        })
    })
}

const getEnvFileRawContent = async (envPath)=> readFileOrNull(envPath)

const getEnvFileRawBackupContent = async (envPath)=> readFileOrNull(backupPathFor(envPath))

const parseEnv = (envFileContent) => {
    const envLines = envFileContent.split(/\r?\n/);
    const envObject = {};

    for (const line of envLines) {
        if (line.trim() !== '' && !line.startsWith('#')) {
            const equalIndex = line.indexOf('=');
            const key = line.substring(0, equalIndex);
            const value = line.substring(equalIndex + 1);
            envObject[key] = value.trim();
        }
    }

    return envObject;
}

const getEnvDataSync = (envPath) => {
    if (!fs.existsSync(envPath)) { 
        fs.closeSync(fs.openSync(envPath, 'w'))
    } 
    return envfile.parse(fs.readFileSync(envPath , 'utf-8'))
}

const setEnvDataSync = (wd, envData) => {
    const envPath = path.join(wd, '.env')
    let parseEnvData = getEnvDataSync(envPath)
    const finalData = {
        ...parseEnvData,
        ...envData
    }
    fs.writeFileSync(envPath, envfile.stringify(finalData))
    return true
}

const setEnvDataSyncAndBackup = (envPath, appName, envData) => {
    if (!envPath) {
        console.error(appName + ' Error: no .env file location resolved');
        return false;
    }
    const backupPath = backupPathFor(envPath);

    // Read content of the original .env file
    let parseEnvData;
    try {
        parseEnvData = envfile.parse(fs.readFileSync(envPath, 'utf-8'));
    } catch (err) {
        console.error(appName + ' Error reading .env file:', err);
        return false;
    }

    // Write content to .env.backup file
    try {
        fs.writeFileSync(backupPath, envfile.stringify(parseEnvData), 'utf-8');
        console.log(appName + ' .env backup file created successfully.');
    } catch (err) {
        console.error(appName + ' Error creating .env backup file:', err);
        return false;
    }

    // Update content of the original .env file
    const finalData = {
        ...parseEnvData,
        ...envData
    };

    try {
        fs.writeFileSync(envPath, envfile.stringify(finalData), 'utf-8');
        console.log(appName + ' .env file updated successfully.');
        return true;
    } catch (err) {
        console.error(appName + ' Error updating .env file:', err);
        return false;
    }
};

module.exports = {
    parseEnv,
    resolveEnvFilePath,
    getEnvFileRawContent,
    getEnvDataSync,
    setEnvDataSync,
    setEnvDataSyncAndBackup,
    getEnvFileRawBackupContent
}