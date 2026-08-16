const { parseVersion, getNvmStatus, listAvailableVersions, installNodeVersion } = require('../utils/nvm.util');

const getNvmInfo = async (req, res) => {
    try {
        const data = await getNvmStatus();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get nvm info error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAvailableVersions = async (req, res) => {
    try {
        const { installed } = await getNvmStatus();
        if (!installed) {
            return res.status(400).json({ success: false, error: 'nvm is not installed on this server' });
        }
        const versions = await listAvailableVersions();
        res.json({ success: true, data: { versions } });
    } catch (error) {
        console.error('List available node versions error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch the available Node.js versions' });
    }
};

const installVersion = async (req, res) => {
    try {
        const version = parseVersion(req.body.version);
        if (!version) {
            return res.status(400).json({ success: false, error: 'Invalid Node.js version — expected x.y.z' });
        }

        const { installed } = await getNvmStatus();
        if (!installed) {
            return res.status(400).json({ success: false, error: 'nvm is not installed on this server' });
        }

        const result = await installNodeVersion(version);
        res.json({ success: true, message: `Node.js ${result.version} installed`, data: result });
    } catch (error) {
        console.error('Install node version error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getNvmInfo,
    getAvailableVersions,
    installVersion
};
