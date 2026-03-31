const si = require('systeminformation');
const { formatBytes } = require('./src/utils/format.util');

async function checkDisks() {
    try {
        const disks = await si.fsSize();
        console.log('Total Disks found:', disks.length);
        disks.forEach((disk, idx) => {
            console.log(`Disk [${idx}]:`, {
                fs: disk.fs,
                type: disk.type,
                size: formatBytes(disk.size),
                used: formatBytes(disk.used),
                mount: disk.mount
            });
        });
    } catch (e) {
        console.error(e);
    }
}

checkDisks();
