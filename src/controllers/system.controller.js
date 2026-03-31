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
        const isWindows = (osInfo.platform).toLowerCase().includes('win');
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
                disks: disk.map(d => ({
                    fs: d.fs,
                    total: formatBytes(d.size || 0),
                    used: formatBytes(d.used || 0),
                    available: formatBytes(d.available || 0),
                    percent: d.size ? (d.used * 100 / d.size).toFixed(2) : '0',
                    mount: d.mount,
                    type: d.type
                })),
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
        const apps = await listApps();
        const osInfo = await si.osInfo();
        const isWindows = (osInfo.platform).toLowerCase().includes('win');
        
        // Use systeminformation's built-in network connection retrieval
        // This is much more reliable and cross-platform than manual parsing
        const connections = await si.networkConnections();
        
        let listPorts = connections
            .filter(conn => conn.state === 'LISTEN' && conn.protocol.startsWith('tcp'))
            .map(conn => ({
                protocol: conn.protocol.toUpperCase(),
                localPort: conn.localPort,
                localAddress: conn.localAddress,
                peerAddress: conn.peerAddress || '*',
                state: conn.state,
                appName: '-',
                isPM2Service: false,
                status: null
            }));

        // Deduplicate ports (si can return multiple entries for same port on different addresses like 0.0.0.0 and [::])
        const uniquePorts = [];
        const seenPorts = new Set();
        
        for (const port of listPorts) {
            if (!seenPorts.has(port.localPort)) {
                seenPorts.add(port.localPort);
                uniquePorts.push(port);
            }
        }
        
        listPorts = uniquePorts;

        // Match ports with app names and known services
        listPorts.forEach(port => {
            const matchingApp = apps.find(app => (app.name).toLowerCase().includes(port.localPort));
            if (matchingApp) {
                port.appName = matchingApp.name;
                port.isPM2Service = true;
                port.status = matchingApp.status;
            } else if (isWindows && parseInt(port.localPort) >= 49152 && parseInt(port.localPort) <= 65535) {
                port.appName = 'Microsoft Dynamic/Private Port';
            } else if (isWindows && (parseInt(port.localPort) == 8443 || parseInt(port.localPort) == 8080)) {
                port.appName = 'Mirth Connect / Tomcat Services';
            } else {
                switch (port.localPort) {
                    case '21': port.appName = 'FTP'; break;
                    case '22': port.appName = 'SSH'; break;
                    case '23': port.appName = 'Telnet'; break;
                    case '25': port.appName = 'SMTP'; break;
                    case '53': port.appName = 'DNS'; break;
                    case '80': port.appName = 'HTTP'; break;
                    case '110': port.appName = 'POP3'; break;
                    case '143': port.appName = 'IMAP'; break;
                    case '443': port.appName = 'HTTPS'; break;
                    case '445': port.appName = 'SMB/Microsoft-DS'; break;
                    case '1433': port.appName = 'MSSQL'; break;
                    case '1521': port.appName = 'Oracle'; break;
                    case '3306': port.appName = 'MySQL'; break;
                    case '3389': port.appName = 'RDP'; break;
                    case '5432': port.appName = 'PostgreSQL'; break;
                    case '6379': port.appName = 'Redis'; break;
                    case '8080': port.appName = 'HTTP-Proxy/Tomcat'; break;
                    case '8443': port.appName = 'HTTPS-Alt'; break;
                    case '27017': port.appName = 'MongoDB'; break;
                    case '2375': port.appName = 'Docker API'; break;
                    case '135': port.appName = 'Microsoft DCOM'; break;
                    case '2179': port.appName = 'Microsoft RDP'; break;
                    default: port.appName = '-';
                }
            }
        });

        listPorts = listPorts.sort((a, b) => parseInt(a.localPort) - parseInt(b.localPort));

        ctx.body = {
            success: true,
            data: {
                listPorts,
                isWindows
            }
        };
    } catch (error) {
        console.error('Get listening ports error:', error);
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
 * Get system shared folders (SMB/NFS)
 */
const getSharedFolders = async (ctx) => {
    try {
        const osInfo = await si.osInfo();
        const isWindows = (osInfo.platform).toLowerCase().includes('win');

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
        } else {
            // Linux implementation
            // 1. Try Samba (SMB) shares using smbstatus
            try {
                const { stdout } = await execAsync('smbstatus -S 2>/dev/null', { shell: true });
                if (stdout) {
                    const lines = stdout.split('\n');
                    let dataStarted = false;
                    for (let line of lines) {
                        line = line.trim();
                        if (line.includes('Service') && line.includes('pid') && line.includes('Machine')) {
                            dataStarted = true;
                            continue;
                        }
                        if (line.startsWith('-----------------')) {
                            dataStarted = true;
                            continue;
                        }
                        if (dataStarted && line) {
                            const parts = line.split(/\s+/);
                            if (parts.length >= 4) {
                                sharedFolders.push({
                                    shareName: parts[0],
                                    path: 'SMB Share',
                                    remark: `User: ${parts[2]} | IP: ${parts[3]}`
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                // smbstatus failed, try parsing smb.conf or usershares
            }

            // 2. Try NFS exports
            try {
                const { stdout } = await execAsync('exportfs -v 2>/dev/null', { shell: true });
                if (stdout) {
                    const lines = stdout.split('\n');
                    for (let line of lines) {
                        line = line.trim();
                        if (line && !line.includes('conf')) {
                            const parts = line.split(/\s+/);
                            if (parts.length >= 2) {
                                sharedFolders.push({
                                    shareName: 'NFS Export',
                                    path: parts[0],
                                    remark: parts.slice(1).join(' ')
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                // exportfs failed
            }
            
            // 3. Try net usershare (common on desktop Linux)
            try {
                const { stdout } = await execAsync('net usershare list 2>/dev/null', { shell: true });
                if (stdout) {
                    const shareNames = stdout.trim().split(/\s+/);
                    for (const name of shareNames) {
                        const { stdout: info } = await execAsync(`net usershare info "${name}"`, { shell: true });
                        const pathMatch = info.match(/path=(.*)/);
                        const remarkMatch = info.match(/comment=(.*)/);
                        if (pathMatch) {
                            sharedFolders.push({
                                shareName: name,
                                path: pathMatch[1].trim(),
                                remark: remarkMatch ? remarkMatch[1].trim() : ''
                            });
                        }
                    }
                }
            } catch (e) {
                // net usershare failed
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
        const isWindows = (osInfo.platform).toLowerCase().includes('win');

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
        } else {
            // Linux implementation (crontab)
            try {
                const { stdout } = await execAsync('crontab -l', { windowsHide: true });
                if (stdout) {
                    const lines = stdout.split('\n');
                    lines.forEach((line, index) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine && !trimmedLine.startsWith('#')) {
                            // Basic parser for crontab syntax: * * * * * command
                            const parts = trimmedLine.split(/\s+/);
                            if (parts.length >= 6) {
                                const schedule = parts.slice(0, 5).join(' ');
                                const command = parts.slice(5).join(' ');
                                scheduledTasks.push({
                                    taskName: `Crontab #${scheduledTasks.length + 1}`,
                                    nextRunTime: schedule,
                                    status: 'Active',
                                    lastRunTime: '-',
                                    lastResult: '-',
                                    author: process.env.USER || 'N/A',
                                    taskToRun: command
                                });
                            }
                        }
                    });
                }
            } catch (error) {
                // crontab -l returns 1 and "no crontab for user" on stderr if it's empty
                console.log('No crontab found or error reading crontab');
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
