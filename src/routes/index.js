const express = require('express');
const router = express.Router();
const { describeApp } = require('../providers/pm2/api');
const { isAuthenticated, isRoot } = require('../middlewares/auth');
const fs = require('fs');
const path = require('path');

const apiRouter = require('./api');

// Mount API router
router.use('/api', apiRouter);

const { isValidAppName } = require('../utils/app-name.util');

// Serve SPA index.html
const serveIndex = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
};

// SPA routes
router.get('/login', serveIndex);
router.get('/apps', serveIndex);
router.get('/apps/:appName', serveIndex);
router.get('/monitor', serveIndex);
router.get('/ports', serveIndex);
router.get('/git-clone', serveIndex);
router.get('/users', serveIndex);
router.get('/scheduled-tasks', serveIndex);

// Confirms a candidate file path is inside an allowed app cwd. Defends against
// PM2 returning a manipulated path or symlink-based escape.
function isPathInside(filePath, allowedDir) {
    const f = path.resolve(filePath);
    const d = path.resolve(allowedDir);
    const rel = path.relative(d, f);
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Log downloads — root only (logs frequently contain secrets / connection strings)
router.get('/apps/:appName/outlog/download', isAuthenticated, isRoot, async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) return res.status(400).json({ error: 'Invalid app name' });
        const app = await describeApp(appName);
        if (!app) return res.status(404).json({ error: 'App not found' });
        const fileName = app.pm_out_log_path;
        if (fileName && fs.existsSync(fileName)) {
            res.download(fileName);
        } else {
            res.status(400).json({ error: 'Requested file not found on server' });
        }
    } catch {
        res.status(500).json({ error: 'Failed to download log' });
    }
});

router.get('/apps/:appName/errorlog/download', isAuthenticated, isRoot, async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) return res.status(400).json({ error: 'Invalid app name' });
        const app = await describeApp(appName);
        if (!app) return res.status(404).json({ error: 'App not found' });
        const fileName = app.pm_err_log_path;
        if (fileName && fs.existsSync(fileName)) {
            res.download(fileName);
        } else {
            res.status(400).json({ error: 'Requested file not found on server' });
        }
    } catch {
        res.status(500).json({ error: 'Failed to download log' });
    }
});

router.get('/apps/:appName/customlog/download', isAuthenticated, isRoot, async (req, res) => {
    try {
        const { appName } = req.params;
        if (!isValidAppName(appName)) return res.status(400).json({ error: 'Invalid app name' });
        const app = await describeApp(appName);
        if (!app) return res.status(404).json({ error: 'App not found' });

        const customLogPath = path.join(app.pm2_env_cwd, 'logs');
        if (!fs.existsSync(customLogPath)) {
            return res.status(404).json({ error: 'Custom log directory not found' });
        }

        const logFiles = fs.readdirSync(customLogPath)
            .filter(file => fs.lstatSync(path.join(customLogPath, file)).isFile())
            .map(file => ({ file, mtime: fs.lstatSync(path.join(customLogPath, file)).mtime }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        if (!logFiles[0]) return res.status(404).json({ error: 'No log files found' });

        const fileName = path.join(customLogPath, logFiles[0].file);
        if (!isPathInside(fileName, customLogPath)) {
            return res.status(400).json({ error: 'Invalid log path' });
        }
        if (fs.existsSync(fileName)) {
            res.download(fileName);
        } else {
            res.status(400).json({ error: 'Requested file not found on server' });
        }
    } catch {
        res.status(500).json({ error: 'Failed to download log' });
    }
});

// Catch-all: serve SPA for unmatched non-API routes
router.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
        return res.status(404).json({ error: 'Not found' });
    }
    serveIndex(req, res);
});

module.exports = router;
