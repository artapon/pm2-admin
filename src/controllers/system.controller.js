const { listApps } = require('../providers/pm2/api');
const { pm2Save, nodeInfo } = require('../providers/pm2/api');
const { formatBytes } = require('../utils/format.util');
const si = require('systeminformation');
const path = require("path");
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);


/**
 * Get server information
 */
const getServerInfo = async (ctx) => {
    try {
        const osInfo = await si.osInfo();
        const isWindows = (osInfo.platform).toLowerCase().includes('windows');
        const cwd = path.resolve(__dirname, '../../..');

        let serverinfo = {};
        try {
            const cpu = await si.currentLoad();
            const cpuInfo = await si.cpu();
            const mem = await si.mem();
            const os = await si.osInfo();
            const disk = await si.fsSize();
            const time = await si.time();
            const networks = await si.networkInterfaces();
            let network = networks.filter(network => network.default);

            serverinfo = {
                cpuInfo: `${cpuInfo.manufacturer} ${cpuInfo.brand} ${cpuInfo.speed} GHz ${cpuInfo.cores} cores.`,
                currentCPU: cpu.currentLoad.toFixed(2),
                memtotal: formatBytes(mem.total),
                memfree: formatBytes(mem.free),
                memused: formatBytes(mem.used),
                memavailable: formatBytes(mem.available),
                memPercent: (mem.used * 100 / mem.total).toFixed(2),
                osinfo: os.platform + ' ' + os.release + ' | Hostname : ' + os.hostname + ' | IP : ' + (network[0]?.ip4 || 'N/A'),
                diskfs: disk[0]?.fs || '',
                diskTotal: formatBytes(disk[0]?.size || 0),
                diskUsed: formatBytes(disk[0]?.used || 0),
                diskAvail: formatBytes(disk[0]?.available || 0),
                diskPercent: disk[0] ? (disk[0].used * 100 / disk[0].size).toFixed(2) : '0',
                diskinfo: 'Drive : ' + (disk[0]?.fs || '') + ' | Total : ' + formatBytes(disk[0]?.size || 0) + ' | Used : ' + formatBytes(disk[0]?.used || 0) + ' | Available : ' + formatBytes(disk[0]?.available || 0),
                timeinfo: new Date(time.current) + " " + time.timezoneName
            };
        } catch (e) {
            console.log(e);
        }

        const node = await nodeInfo();

        ctx.body = {
            success: true,
            data: {
                serverinfo,
                isWindows,
                cwd,
                node
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get listening ports
 */
const getListeningPorts = async (ctx) => {
    try {
        let listPorts = [];
        const apps = await listApps();
        const osInfo = await si.osInfo();
        const isWindows = (osInfo.platform).toLowerCase().includes('windows');

        if (isWindows) {
            let stdout = await new Promise((resolve, reject) => {
                exec('netstat -an | findstr "LISTENING" | findstr "TCP"', { windowsHide: true, shell: true } ,(err, stdout, stderr) => {
                    if (!err && typeof stdout === 'string') {
                        resolve(stdout.trim());
                    }
                    resolve(null);
                });
            });

            // Split the data into an array of lines
            const lines = stdout.trim().split('\n');

            // Extract TCP, LISTENING, and the number after [:::], and filter out null values
            listPorts = lines.map(line => {
                const match = line.match(/(\bTCP\b)\s+(\[.*\]):(\d+)\s+(\[.*\]):(\d+)\s+(\bLISTENING\b)/);
                return match ? { protocol: match[1], localPort: match[3], remoteAddress: match[4], state: match[5] } : null;
            }).filter(item => item !== null);

            // Match ports with app names
            listPorts.forEach(port => {
                const matchingApp = apps.find(app => (app.name).toLowerCase().includes(port.localPort));
                if (matchingApp) {
                    port.appName = matchingApp.name;
                    port.isPM2Service = true;
                    port.status = matchingApp.status;
                } else if (parseInt(port.localPort) >= 49152 && parseInt(port.localPort) <= 65535) {
                    port.appName = 'Microsoft Dynamic/Private Port';
                } else if (parseInt(port.localPort) == '8443' || parseInt(port.localPort) == '8080') {
                    port.appName = 'Mirth Connect / Tomcat Services';
                } else {
                    switch (port.localPort) {
                        case '135':
                            port.appName = 'Microsoft DCOM';
                            break;
                        case '445':
                            port.appName = 'Microsoft-DS (Directory Services)';
                            break;
                        case '2179':
                            port.appName = 'Microsoft RDP (Remote Desktop Protocol)';
                            break;
                        case '2375':
                            port.appName = 'Docker API';
                            break;
                        default:
                            port.appName = '-';
                    }
                }
            });
        }

        listPorts = listPorts.sort((a, b) => a.localPort - b.localPort);

        ctx.body = {
            success: true,
            data: {
                listPorts,
                isWindows
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Save PM2 process list
 */
const savePM2 = async (ctx) => {
    try {
        const pm2save = await pm2Save();

        if (pm2save.status == 'success') {
            ctx.body = {
                success: true,
                message: pm2save.msg
            };
        } else {
            ctx.status = 500;
            ctx.body = {
                success: false,
                error: pm2save.msg
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Git clone repository
 */
const gitClone = async (ctx) => {
    try {
        const { gitUrl, gitUsername, gitPassword, tofolder, branch = 'master', envContent, appName, startScript } = ctx.request.body;

        if (!gitUrl || !gitUsername || !gitPassword || !envContent || !startScript || !appName) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'gitUrl, gitUsername, gitPassword, envContent, startScript, and appName are required'
            };
            return;
        }

        const { gitClone: gitCloneUtil } = require('../utils/git.util');
        const gitCloneStatus = await gitCloneUtil(gitUrl, gitUsername, gitPassword, tofolder || '', branch, envContent, appName, startScript);

        if (gitCloneStatus.status == 'success') {
            ctx.body = {
                success: true,
                message: gitCloneStatus.msg
            };
        } else {
            ctx.status = 500;
            ctx.body = {
                success: false,
                error: gitCloneStatus.msg
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get system monitoring data (CPU, RAM, Disk I/O)
 */
const getSystemMonitor = async (ctx) => {
    try {
        const cpu = await si.currentLoad();
        const cpuInfo = await si.cpu();
        const mem = await si.mem();

        ctx.body = {
            success: true,
            data: {
                cpu: {
                    usage: parseFloat(cpu.currentLoad.toFixed(2)),
                    cores: cpuInfo.cores,
                    model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`
                },
                memory: {
                    total: mem.total,
                    used: mem.used,
                    free: mem.free,
                    percent: parseFloat((mem.used * 100 / mem.total).toFixed(2))
                },
                timestamp: Date.now()
            }
        };
    } catch (error) {
        console.error('System monitor error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get top 100 processes
 */
const getTopProcesses = async (ctx) => {
    try {
        const processes = await si.processes();

        // Sort by CPU and get top 100
        const topProcesses = processes.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 100)
            .map(proc => ({
                pid: proc.pid,
                name: proc.name,
                cpu: parseFloat(proc.cpu.toFixed(2)),
                memory: proc.mem || 0,
                memoryPercent: parseFloat((proc.memPercent || 0).toFixed(2))
            }));

        ctx.body = {
            success: true,
            data: {
                processes: topProcesses
            }
        };
    } catch (error) {
        console.error('Get processes error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get Windows shared folders
 */
const getSharedFolders = async (ctx) => {
    try {
        const osInfo = await si.osInfo();
        const isWindows = (osInfo.platform).toLowerCase().includes('windows');

        let sharedFolders = [];

        if (isWindows) {
            try {
                const { stdout } = await execAsync('net share', { windowsHide: true, shell: false });

                // Parse the output
                const lines = stdout.split('\n');
                let dataStarted = false;

                for (let line of lines) {
                    line = line.trim();

                    // Skip header lines and separators
                    if (line.includes('Share name') || line.includes('---') || line === '') {
                        if (line.includes('---')) dataStarted = true;
                        continue;
                    }

                    if (dataStarted && line) {
                        // Parse share information
                        // Format: ShareName  DiskType  Path  Remark
                        const parts = line.split(/\s{2,}/); // Split by 2 or more spaces

                        if (parts.length >= 2) {
                            const shareName = parts[0];
                            const path = parts[1] || '';
                            const remark = parts.slice(3).join(' ') || '';

                            // Skip system shares (ending with $) and command completed message
                            if (!shareName.endsWith('$') && !line.includes('command completed')) {
                                sharedFolders.push({
                                    shareName,
                                    path,
                                    remark
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to get shared folders:', error);
            }
        }

        ctx.body = {
            success: true,
            data: {
                sharedFolders,
                isWindows
            }
        };
    } catch (error) {
        console.error('Get shared folders error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get Windows scheduled tasks
 */
const getScheduledTasks = async (ctx) => {
    try {
        const osInfo = await si.osInfo();
        const isWindows = (osInfo.platform).toLowerCase().includes('windows');

        let scheduledTasks = [];

        if (isWindows) {
            try {
                const { stdout } = await execAsync('schtasks /query /fo csv /v', {
                    windowsHide: true,
                    shell: false
                });

                // Parse CSV output
                const lines = stdout.split('\n').filter(line => line.trim());

                if (lines.length > 1) {
                    // Skip header line
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        // Parse CSV line (handle quoted fields)
                        const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                        const cleanFields = fields.map(f => f.replace(/^"|"$/g, '').trim());

                        if (cleanFields.length >= 9) {
                            scheduledTasks.push({
                                taskName: cleanFields[0],
                                nextRunTime: cleanFields[1],
                                status: cleanFields[2],
                                lastRunTime: cleanFields[3],
                                lastResult: cleanFields[4],
                                author: cleanFields[5],
                                taskToRun: cleanFields[6]
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to get scheduled tasks:', error);
            }
        }

        ctx.body = {
            success: true,
            data: {
                scheduledTasks,
                isWindows
            }
        };
    } catch (error) {
        console.error('Get scheduled tasks error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    getServerInfo,
    getListeningPorts,
    savePM2,
    gitClone,
    getSystemMonitor,
    getTopProcesses,
    getSharedFolders,
    getScheduledTasks
};
