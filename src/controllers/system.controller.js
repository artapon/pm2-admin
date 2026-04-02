const { listApps, pm2Save, nodeInfo } = require('../providers/pm2/api');
const { formatBytes } = require('../utils/format.util');
const si = require('systeminformation');
const path = require("path");
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Cache platform detection — resolved once on first use
let _isWindows = null;
const getIsWindows = async () => {
    if (_isWindows === null) {
        const os = await si.osInfo();
        _isWindows = os.platform.toLowerCase().includes('win');
    }
    return _isWindows;
};

const getServerInfo = async (req, res) => {
    try {
        const cwd = path.resolve(__dirname, '../../..');

        let serverinfo = {};
        try {
            const [cpu, cpuInfo, mem, os, disk, time, networks] = await Promise.all([
                si.currentLoad(),
                si.cpu(),
                si.mem(),
                si.osInfo(),
                si.fsSize(),
                si.time(),
                si.networkInterfaces()
            ]);
            const isWindows = os.platform.toLowerCase().includes('win');
            _isWindows = isWindows; // populate cache
            const network = networks.filter(n => n.default);

            serverinfo = {
                cpuInfo: `${cpuInfo.manufacturer} ${cpuInfo.brand} ${cpuInfo.speed} GHz ${cpuInfo.cores} cores.`,
                currentCPU: cpu.currentLoad.toFixed(2),
                memtotal: formatBytes(mem.total),
                memfree: formatBytes(mem.free),
                memused: formatBytes(mem.used),
                memavailable: formatBytes(mem.available),
                memPercent: (mem.used * 100 / mem.total).toFixed(2),
                osinfo: `${os.platform} ${os.release} | Hostname : ${os.hostname} | IP : ${network[0]?.ip4 || 'N/A'}`,
                disks: disk.map(d => ({
                    fs: d.fs,
                    total: formatBytes(d.size || 0),
                    used: formatBytes(d.used || 0),
                    available: formatBytes(d.available || 0),
                    percent: d.size ? (d.used * 100 / d.size).toFixed(2) : '0',
                    mount: d.mount,
                    type: d.type
                })),
                timeinfo: new Date(time.current) + ' ' + time.timezoneName
            };
        } catch (e) {
            console.log(e);
        }

        const node = await nodeInfo();

        res.json({
            success: true,
            data: { serverinfo, isWindows, cwd, node }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getListeningPorts = async (req, res) => {
    try {
        const [apps, isWindows] = await Promise.all([listApps(), getIsWindows()]);

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

        const uniquePorts = [];
        const seenPorts = new Set();
        for (const port of listPorts) {
            if (!seenPorts.has(port.localPort)) {
                seenPorts.add(port.localPort);
                uniquePorts.push(port);
            }
        }
        listPorts = uniquePorts;

        // Build port→app Map for O(1) lookup instead of O(n*m) find
        const portToApp = new Map();
        apps.forEach(app => {
            const m = app.name.match(/:(\d+)/);
            if (m) portToApp.set(m[1], app);
        });

        listPorts.forEach(port => {
            const matchingApp = portToApp.get(port.localPort);
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

        res.json({ success: true, data: { listPorts, isWindows } });
    } catch (error) {
        console.error('Get listening ports error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const savePM2 = async (req, res) => {
    try {
        const pm2save = await pm2Save();

        if (pm2save.status === 'success') {
            res.json({ success: true, message: pm2save.msg });
        } else {
            res.status(500).json({ success: false, error: pm2save.msg });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const gitClone = async (req, res) => {
    try {
        const { gitUrl, gitUsername, gitPassword, tofolder, branch = 'master', envContent, appName, startScript } = req.body;

        if (!gitUrl || !gitUsername || !gitPassword || !envContent || !startScript || !appName) {
            return res.status(400).json({
                success: false,
                error: 'gitUrl, gitUsername, gitPassword, envContent, startScript, and appName are required'
            });
        }

        const { gitClone: gitCloneUtil } = require('../utils/git.util');
        const gitCloneStatus = await gitCloneUtil(gitUrl, gitUsername, gitPassword, tofolder || '', branch, envContent, appName, startScript);

        if (gitCloneStatus.status === 'success') {
            res.json({ success: true, message: gitCloneStatus.msg });
        } else {
            res.status(500).json({ success: false, error: gitCloneStatus.msg });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getSystemMonitor = async (req, res) => {
    try {
        const [cpu, cpuInfo, mem] = await Promise.all([
            si.currentLoad(),
            si.cpu(),
            si.mem()
        ]);

        res.json({
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
        });
    } catch (error) {
        console.error('System monitor error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getTopProcesses = async (req, res) => {
    try {
        const processes = await si.processes();

        const topProcesses = processes.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 100)
            .map(proc => ({
                pid: proc.pid,
                name: proc.name,
                cpu: parseFloat(proc.cpu.toFixed(2)),
                memory: (proc.memRss || 0) * 1024,
                memoryPercent: parseFloat((proc.mem || 0).toFixed(2))
            }));

        res.json({ success: true, data: { processes: topProcesses } });
    } catch (error) {
        console.error('Get processes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getSharedFolders = async (req, res) => {
    try {
        const isWindows = await getIsWindows();

        let sharedFolders = [];

        if (isWindows) {
            try {
                const { stdout } = await execAsync('net share', { windowsHide: true, shell: false });
                const lines = stdout.split('\n');
                let dataStarted = false;

                for (let line of lines) {
                    line = line.trim();
                    if (line.includes('Share name') || line.includes('---') || line === '') {
                        if (line.includes('---')) dataStarted = true;
                        continue;
                    }
                    if (dataStarted && line) {
                        const parts = line.split(/\s{2,}/);
                        if (parts.length >= 2) {
                            const shareName = parts[0];
                            const sharePath = parts[1] || '';
                            const remark = parts.slice(3).join(' ') || '';
                            if (!shareName.endsWith('$') && !line.includes('command completed')) {
                                sharedFolders.push({ shareName, path: sharePath, remark });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to get shared folders:', error);
            }
        } else {
            try {
                const { stdout } = await execAsync('smbstatus -S 2>/dev/null', { shell: true });
                if (stdout) {
                    const lines = stdout.split('\n');
                    let dataStarted = false;
                    for (let line of lines) {
                        line = line.trim();
                        if (line.includes('Service') && line.includes('pid') && line.includes('Machine')) { dataStarted = true; continue; }
                        if (line.startsWith('-----------------')) { dataStarted = true; continue; }
                        if (dataStarted && line) {
                            const parts = line.split(/\s+/);
                            if (parts.length >= 4) {
                                sharedFolders.push({ shareName: parts[0], path: 'SMB Share', remark: `User: ${parts[2]} | IP: ${parts[3]}` });
                            }
                        }
                    }
                }
            } catch (e) { /* smbstatus not available */ }

            try {
                const { stdout } = await execAsync('exportfs -v 2>/dev/null', { shell: true });
                if (stdout) {
                    const lines = stdout.split('\n');
                    for (let line of lines) {
                        line = line.trim();
                        if (line && !line.includes('conf')) {
                            const parts = line.split(/\s+/);
                            if (parts.length >= 2) {
                                sharedFolders.push({ shareName: 'NFS Export', path: parts[0], remark: parts.slice(1).join(' ') });
                            }
                        }
                    }
                }
            } catch (e) { /* exportfs not available */ }

            try {
                const { stdout } = await execAsync('net usershare list 2>/dev/null', { shell: true });
                if (stdout) {
                    const shareNames = stdout.trim().split(/\s+/);
                    const results = await Promise.allSettled(
                        shareNames.map(name => execAsync(`net usershare info "${name}"`, { shell: true }))
                    );
                    results.forEach((result, idx) => {
                        if (result.status === 'fulfilled') {
                            const info = result.value.stdout;
                            const pathMatch = info.match(/path=(.*)/);
                            const remarkMatch = info.match(/comment=(.*)/);
                            if (pathMatch) {
                                sharedFolders.push({ shareName: shareNames[idx], path: pathMatch[1].trim(), remark: remarkMatch ? remarkMatch[1].trim() : '' });
                            }
                        }
                    });
                }
            } catch (e) { /* net usershare not available */ }
        }

        res.json({ success: true, data: { sharedFolders, isWindows } });
    } catch (error) {
        console.error('Get shared folders error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getScheduledTasks = async (req, res) => {
    try {
        const isWindows = await getIsWindows();

        let scheduledTasks = [];

        if (isWindows) {
            try {
                const { stdout } = await execAsync('schtasks /query /fo csv /v', { windowsHide: true, shell: false });
                const lines = stdout.split('\n').filter(line => line.trim());

                if (lines.length > 1) {
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;
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
            try {
                const { stdout } = await execAsync('crontab -l', { windowsHide: true });
                if (stdout) {
                    const lines = stdout.split('\n');
                    lines.forEach(line => {
                        const trimmedLine = line.trim();
                        if (trimmedLine && !trimmedLine.startsWith('#')) {
                            const parts = trimmedLine.split(/\s+/);
                            if (parts.length >= 6) {
                                scheduledTasks.push({
                                    taskName: `Crontab #${scheduledTasks.length + 1}`,
                                    nextRunTime: parts.slice(0, 5).join(' '),
                                    status: 'Active',
                                    lastRunTime: '-',
                                    lastResult: '-',
                                    author: process.env.USER || 'N/A',
                                    taskToRun: parts.slice(5).join(' ')
                                });
                            }
                        }
                    });
                }
            } catch (error) {
                console.log('No crontab found or error reading crontab');
            }
        }

        res.json({ success: true, data: { scheduledTasks, isWindows } });
    } catch (error) {
        console.error('Get scheduled tasks error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const LOG_ROTATE_KEYS = ['max_size', 'retain', 'compress', 'dateFormat', 'rotateModule', 'workerInterval', 'rotateInterval', 'TZ'];
const LOG_ROTATE_DEFAULTS = {
    max_size: '1G',
    retain: '3',
    compress: 'false',
    dateFormat: 'YYYY-MM-DD_HH-mm-ss',
    rotateModule: 'true',
    workerInterval: '30',
    rotateInterval: '0 0 1 * *',
    TZ: ''
};

const getLogRotateConfig = async (req, res) => {
    try {
        let installed = false;
        try {
            await execAsync('pm2 describe pm2-logrotate', { shell: true, windowsHide: true });
            installed = true;
        } catch { installed = false; }

        let config = { ...LOG_ROTATE_DEFAULTS };
        if (installed) {
            try {
                const pm2Home = process.env.PM2_HOME || path.join(os.homedir(), '.pm2');
                const confPath = path.join(pm2Home, 'module_conf.json');
                const confData = JSON.parse(fs.readFileSync(confPath, 'utf-8'));
                if (confData['pm2-logrotate']) {
                    config = { ...config, ...confData['pm2-logrotate'] };
                }
            } catch { /* use defaults */ }
        }

        res.json({ success: true, data: { installed, config } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const setLogRotateConfig = async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!LOG_ROTATE_KEYS.includes(key)) {
            return res.status(400).json({ success: false, error: 'Invalid configuration key' });
        }
        const safeValue = String(value).replace(/"/g, '\\"');
        await execAsync(`pm2 set pm2-logrotate:${key} "${safeValue}"`, { shell: true, windowsHide: true });
        res.json({ success: true, message: `pm2-logrotate:${key} updated` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
    getScheduledTasks,
    getLogRotateConfig,
    setLogRotateConfig
};
