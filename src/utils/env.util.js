const fs = require('fs');
const envfile = require('envfile')
const path = require('path')

const getEnvFileContentObject = async (wd)=>{
    const envPath = path.join(wd, '.env')
    return new Promise((resolve, reject) => {
        fs.readFile(envPath , 'utf-8', function(err, data){
            if(!err){
                resolve(parseEnv(data))
            }
            resolve(null)
        })
    })
}

const getEnvFileRawContent = async (wd)=>{
    const envPath = path.join(wd, '.env')
    return new Promise((resolve, reject) => {
        fs.readFile(envPath , 'utf-8', function(err, data){
            if(!err){
                resolve(data)
            }
            resolve(null)
        })
    })
}

const getEnvFileRawBackupContent = async (wd)=>{
    const envPath = path.join(wd, '.env.backup')
    return new Promise((resolve, reject) => {
        fs.readFile(envPath , 'utf-8', function(err, data){
            if(!err){
                resolve(data)
            }
            resolve(null)
        })
    })
}

const parseEnv = (envFileContent) => {
    const envLines = envFileContent.split('\n');
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

const setEnvDataSyncAndBackup = (wd, appName, envData) => {
    const envPath = path.join(wd, '.env');
    const backupPath = path.join(wd, '.env.backup');

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
    getEnvFileContentObject,
    getEnvFileRawContent,
    getEnvDataSync,
    setEnvDataSync,
    setEnvDataSyncAndBackup,
    getEnvFileRawBackupContent
}