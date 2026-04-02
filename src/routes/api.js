const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { isAuthenticated, isRoot } = require('../middlewares/auth');
const appsController = require('../controllers/apps.controller');
const authController = require('../controllers/auth.controller');
const systemController = require('../controllers/system.controller');
const usersController = require('../controllers/users.controller');

const loginRateLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

const gitRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many git requests, please try again later' }
});

// Auth routes
router.post('/auth/login', loginRateLimiter, authController.login);
router.post('/auth/logout', isAuthenticated, authController.logout);
router.get('/auth/session', authController.getSession);
router.get('/auth/setup-check', authController.checkSetupRequired);
router.post('/auth/setup-initial', authController.setupInitialRootUser);

// User Management routes (root only)
router.get('/users', isAuthenticated, isRoot, usersController.getAllUsers);
router.post('/users', isAuthenticated, isRoot, usersController.createUser);
router.patch('/users/:id', isAuthenticated, isRoot, usersController.updateUser);
router.delete('/users/:id', isAuthenticated, isRoot, usersController.deleteUser);
router.post('/users/:id/change-password', isAuthenticated, usersController.changePassword);

// Apps routes
router.get('/apps', isAuthenticated, appsController.getAllApps);
router.get('/apps/dashboard', isAuthenticated, appsController.getDashboard);
router.get('/apps/:appName', isAuthenticated, appsController.getApp);
router.get('/apps/:appName/logs/:logType', isAuthenticated, appsController.getAppLogs);
router.post('/apps/:appName/reload', isAuthenticated, isRoot, appsController.reloadAppAction);
router.post('/apps/:appName/restart', isAuthenticated, isRoot, appsController.restartAppAction);
router.post('/apps/:appName/restart-rename', isAuthenticated, isRoot, appsController.restartAppWithRenameAction);
router.post('/apps/:appName/stop', isAuthenticated, isRoot, appsController.stopAppAction);
router.post('/apps/:appName/delete', isAuthenticated, isRoot, appsController.deleteAppAction);
router.post('/apps/:appName/flush', isAuthenticated, isRoot, appsController.flushAppLogs);
router.post('/apps/:appName/updateEnv', isAuthenticated, isRoot, appsController.updateAppEnv);
router.post('/apps/:appName/gitpull', isAuthenticated, isRoot, gitRateLimiter, appsController.gitPullApp);

// System routes
router.get('/system/info', isAuthenticated, systemController.getServerInfo);
router.get('/system/ports', isAuthenticated, systemController.getListeningPorts);
router.post('/system/pm2/save', isAuthenticated, isRoot, systemController.savePM2);
router.post('/system/git/clone', isAuthenticated, isRoot, gitRateLimiter, systemController.gitClone);
router.get('/system/monitor', isAuthenticated, systemController.getSystemMonitor);
router.get('/system/processes', isAuthenticated, systemController.getTopProcesses);
router.get('/system/shares', isAuthenticated, systemController.getSharedFolders);
router.get('/system/scheduled-tasks', isAuthenticated, systemController.getScheduledTasks);
router.get('/system/logrotate', isAuthenticated, isRoot, systemController.getLogRotateConfig);
router.post('/system/logrotate', isAuthenticated, isRoot, systemController.setLogRotateConfig);

module.exports = router;
