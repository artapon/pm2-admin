const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { isAuthenticated, isRoot } = require('../middlewares/auth');
const appsController = require('../controllers/apps.controller');
const authController = require('../controllers/auth.controller');
const systemController = require('../controllers/system.controller');
const usersController = require('../controllers/users.controller');

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
router.post('/apps/:appName/reload', isAuthenticated, isRoot, writeActionLimiter, appsController.reloadAppAction);
router.post('/apps/:appName/restart', isAuthenticated, isRoot, writeActionLimiter, appsController.restartAppAction);
router.post('/apps/:appName/restart-rename', isAuthenticated, isRoot, writeActionLimiter, appsController.restartAppWithRenameAction);
router.post('/apps/:appName/stop', isAuthenticated, isRoot, writeActionLimiter, appsController.stopAppAction);
router.post('/apps/:appName/delete', isAuthenticated, isRoot, writeActionLimiter, appsController.deleteAppAction);
router.post('/apps/:appName/flush', isAuthenticated, isRoot, writeActionLimiter, appsController.flushAppLogs);
router.post('/apps/:appName/updateEnv', isAuthenticated, isRoot, writeActionLimiter, appsController.updateAppEnv);
router.post('/apps/:appName/gitpull', isAuthenticated, isRoot, gitRateLimiter, appsController.gitPullApp);

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

module.exports = router;
