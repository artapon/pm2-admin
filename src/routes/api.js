const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { isAuthenticated, isRoot } = require('../middlewares/auth');
const appsController = require('../controllers/apps.controller');
const authController = require('../controllers/auth.controller');
const systemController = require('../controllers/system.controller');
const usersController = require('../controllers/users.controller');
const nvmController = require('../controllers/nvm.controller');

// Login: tight limit + per-IP, slows brute-force significantly
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only failed attempts count toward the limit
    message: { success: false, error: 'Too many login attempts. Try again later.' }
});

// Setup endpoint must be heavily rate limited — it creates the initial root user
const setupRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many setup attempts.' }
});

// Password change limiter — prevents online password guessing
const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many password change attempts.' }
});

const gitRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many git requests, please try again later' }
});

// Installing a Node.js version downloads a runtime and writes to the nvm root —
// far heavier than a normal write action, so it gets its own tight limit
const nvmInstallLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many install requests, please try again later' }
});

// Only the network-touching form of the branch listing needs throttling — reading local
// refs is cheap enough that limiting it would just break a busy page
const fetchRateLimiter = (req, res, next) =>
    (req.query.fetch === '1' || req.query.fetch === 'true') ? gitRateLimiter(req, res, next) : next();

// Generic write-action limiter — applied to PM2 mutation endpoints
const writeActionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests' }
});

// Auth routes
router.post('/auth/login', loginRateLimiter, authController.login);
router.post('/auth/logout', isAuthenticated, authController.logout);
router.get('/auth/session', authController.getSession);
router.get('/auth/setup-check', authController.checkSetupRequired);
router.get('/auth/setup-env', authController.getSetupEnvConfig);
router.post('/auth/setup-initial', setupRateLimiter, authController.setupInitialRootUser);

// User Management routes (root only)
router.get('/users', isAuthenticated, isRoot, usersController.getAllUsers);
router.post('/users', isAuthenticated, isRoot, writeActionLimiter, usersController.createUser);
router.patch('/users/:id', isAuthenticated, isRoot, writeActionLimiter, usersController.updateUser);
router.delete('/users/:id', isAuthenticated, isRoot, writeActionLimiter, usersController.deleteUser);
router.post('/users/:id/change-password', isAuthenticated, passwordChangeLimiter, usersController.changePassword);

// Apps routes
router.get('/apps', isAuthenticated, appsController.getAllApps);
router.get('/apps/dashboard', isAuthenticated, appsController.getDashboard);
router.get('/apps/:appName', isAuthenticated, appsController.getApp);
router.get('/apps/:appName/logs/:logType', isAuthenticated, appsController.getAppLogs);
// `pm2 describe` prints filesystem paths and any divergent env vars — root only,
// same as the .env contents on the detail page
router.get('/apps/:appName/describe', isAuthenticated, isRoot, appsController.getAppDescribe);
router.post('/apps/:appName/reload', isAuthenticated, isRoot, writeActionLimiter, appsController.reloadAppAction);
router.post('/apps/:appName/restart', isAuthenticated, isRoot, writeActionLimiter, appsController.restartAppAction);
router.post('/apps/:appName/restart-rename', isAuthenticated, isRoot, writeActionLimiter, appsController.restartAppWithRenameAction);
router.post('/apps/:appName/reset', isAuthenticated, isRoot, writeActionLimiter, appsController.resetAppAction);
router.post('/apps/:appName/stop', isAuthenticated, isRoot, writeActionLimiter, appsController.stopAppAction);
router.post('/apps/:appName/delete', isAuthenticated, isRoot, writeActionLimiter, appsController.deleteAppAction);
router.post('/apps/:appName/flush', isAuthenticated, isRoot, writeActionLimiter, appsController.flushAppLogs);
router.post('/apps/:appName/updateEnv', isAuthenticated, isRoot, writeActionLimiter, appsController.updateAppEnv);
router.post('/apps/:appName/gitpull', isAuthenticated, isRoot, gitRateLimiter, appsController.gitPullApp);
// Listing branches reads local refs and costs nothing — only `?fetch=1` touches the network
router.get('/apps/:appName/branches', isAuthenticated, isRoot, fetchRateLimiter, appsController.getAppBranches);
router.post('/apps/:appName/branch', isAuthenticated, isRoot, gitRateLimiter, appsController.checkoutAppBranch);

// System routes — most are read-only and visible to any authenticated user.
// Shares and scheduled-tasks can leak sensitive layout info — restrict to root.
router.get('/system/info', isAuthenticated, systemController.getServerInfo);
router.get('/system/ports', isAuthenticated, systemController.getListeningPorts);
router.post('/system/pm2/save', isAuthenticated, isRoot, writeActionLimiter, systemController.savePM2);
router.post('/system/git/clone', isAuthenticated, isRoot, gitRateLimiter, systemController.gitClone);
router.get('/system/monitor', isAuthenticated, systemController.getSystemMonitor);
router.get('/system/processes', isAuthenticated, systemController.getTopProcesses);
router.get('/system/shares', isAuthenticated, isRoot, systemController.getSharedFolders);
router.get('/system/scheduled-tasks', isAuthenticated, isRoot, systemController.getScheduledTasks);
router.get('/system/logrotate', isAuthenticated, isRoot, systemController.getLogRotateConfig);
router.post('/system/logrotate', isAuthenticated, isRoot, writeActionLimiter, systemController.setLogRotateConfig);
router.post('/system/logrotate/install', isAuthenticated, isRoot, writeActionLimiter, systemController.installLogRotate);

// NVM routes — the interpreter paths describe the server layout, and installing a
// runtime is a privileged action, so the whole area is root only
router.get('/nvm', isAuthenticated, isRoot, nvmController.getNvmInfo);
router.get('/nvm/available', isAuthenticated, isRoot, nvmController.getAvailableVersions);
router.post('/nvm/install', isAuthenticated, isRoot, nvmInstallLimiter, nvmController.installVersion);

module.exports = router;
