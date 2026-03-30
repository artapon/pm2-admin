const pm2 = require('pm2');
const { exec } = require('child_process');
const { bytesToSize, timeSince } = require('./ux.helper')

function listApps() {
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.list((err, apps) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                apps = apps.map((app) => {
                    return {
                        name: app.name,
                        status: app.pm2_env.status,
                        cpu: app.monit.cpu,
                        memory: bytesToSize(app.monit.memory),
                        uptime: timeSince(app.pm2_env.pm_uptime),
                        pm_id: app.pm_id,
                        restarts: app.pm2_env.restart_time,
                        node_args: app.pm2_env.node_args,
                        env: (process.env.APP_ENV).toUpperCase()
                    }
                })
                resolve(apps)
            })
        })
    })
}

function describeApp(appName) {
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.describe(appName, (err, apps) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                if (Array.isArray(apps) && apps.length > 0) {
                    const app = {
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
                        env: (process.env.APP_ENV).toUpperCase()
                    }
                    resolve(app)
                }
                else {
                    resolve(null)
                }
            })
        })
    })
}

function reloadApp(process) {
    console.log('pm2 reload : ' + process);
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.reload(process, (err, proc) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                resolve(proc)
            })
        })
    })
}

function stopApp(process) {
    console.log('pm2 stop : ' + process);
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.stop(process, (err, proc) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                resolve(proc)
            })
        })
    })
}

function flushApp(process) {
    console.log('pm2 flush : ' + process);
    return new Promise((resolve, reject) => {
        exec(`pm2 flush ${process}`, { windowsHide: true, shell: true }, (err, stdout, stderr) => {
            if (!err && typeof stdout === 'string') {
                resolve(stdout.trim())
            }
            resolve(stdout.trim())
        });
    })
}

function restartApp(process) {
    console.log('pm2 restart : ' + process);
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.restart(process, (err, proc) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                resolve(proc)
            })
        })
    })
}

function pm2Save() {
    console.log('pm2 save');
    const pm2SaveStatus = { status: null, msg: null };
    return new Promise((resolve, reject) => {
        exec('pm2 save', { windowsHide: true, shell: true }, (err, stdout, stderr) => {
            console.log(stdout)
            if (err) {
                pm2SaveStatus.status = 'error';
                pm2SaveStatus.msg = stderr;
            } else {
                pm2SaveStatus.status = 'success';
                pm2SaveStatus.msg = 'pm2 save successfully.';
            }

            resolve(pm2SaveStatus);
        });
    })
}

function deleteApp(process) {
    console.log('pm2 delete : ' + process);
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.delete(process, (err, proc) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                resolve(proc)
            })
        })
    })
}

function restartAppWithRename(oldName, newName, scriptPath, cwd, nodeArgs) {
    console.log(`pm2 restart with rename: ${oldName} -> ${newName}`);
    return new Promise((resolve, reject) => {
        // Use exec commands to avoid PM2 API connection issues
        exec(`pm2 delete ${oldName}`, { windowsHide: true, shell: true }, (deleteErr) => {
            if (deleteErr) {
                console.error('Delete error:', deleteErr);
                reject(deleteErr);
                return;
            }

            // Start with new name and log date format
            let startCmd = `pm2 start "${scriptPath}" --name "${newName}" --cwd "${cwd}" --log-date-format "YYYY-MM-DD HH:mm:ss"`;
            if (nodeArgs) {
                startCmd += ` --node-args "${nodeArgs}"`;
            }
            exec(startCmd, { windowsHide: true, shell: true }, (startErr, stdout, stderr) => {
                if (startErr) {
                    console.error('Start error:', stderr);
                    reject(startErr);
                    return;
                }

                console.log('Start output:', stdout);

                // Run pm2 save after successful start
                exec('pm2 save', { windowsHide: true, shell: true }, (saveErr, saveStdout, saveStderr) => {
                    if (saveErr) {
                        console.error('pm2 save failed:', saveStderr);
                    } else {
                        console.log('pm2 save completed');
                    }

                    // Resolve with success even if save fails
                    resolve([{ name: newName }]);
                });
            });
        });
    });
}

function nodeInfo() {
    return new Promise((resolve, reject) => {
        exec("node -v", { windowsHide: true, shell: true }, (err, nodeStdout) => {
            if (err) {
                return reject(new Error("Failed to get Node.js version"));
            }

            resolve({
                node: nodeStdout.trim()
            });
        });
    });
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
}
