const si = require('systeminformation');
const { cached } = require('./cache.util');

// systeminformation has no cache of its own — on Windows every call shells out to WMI,
// so si.osInfo/si.cpu/si.networkInterfaces cost 1-2 seconds *each*, *every* time. They were
// being re-read on every dashboard load, app detail view and monitor poll. TTLs below match
// how fast each value can realistically change; the volatile ones (currentLoad, time) are
// cheap and stay uncached.
const HOUR = 60 * 60 * 1000;

// Hardware and OS identity: fixed for the lifetime of the process.
const cpuInfo = cached(() => si.cpu(), { freshMs: HOUR });
const osInfo = cached(() => si.osInfo(), { freshMs: HOUR });

// Addresses change only when someone reconfigures the network.
const networkInterfaces = cached(() => si.networkInterfaces(), { freshMs: 60 * 1000, staleMs: 60 * 1000 });

// Disk usage moves slowly; memory is the one metric worth keeping near-live.
const fsSize = cached(() => si.fsSize(), { freshMs: 15 * 1000, staleMs: 30 * 1000 });
const mem = cached(() => si.mem(), { freshMs: 2 * 1000 });

const isWindows = async () => (await osInfo()).platform.toLowerCase().includes('win');

// Default network IP, used for the app URLs shown in the UI.
const defaultIp = async () => {
    const networks = await networkInterfaces();
    return networks.filter(n => n.default)[0]?.ip4 || 'localhost';
};

module.exports = {
    cpuInfo,
    osInfo,
    networkInterfaces,
    fsSize,
    mem,
    isWindows,
    defaultIp,
    // pass-throughs: fast enough to read live every time
    currentLoad: () => si.currentLoad(),
    time: () => si.time(),
    networkConnections: () => si.networkConnections()
};
