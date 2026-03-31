const RateLimit = require('koa2-ratelimit').RateLimit;
const router = require('@koa/router')();
const { describeApp, reloadApp, restartApp, stopApp, flushApp, pm2Save, nodeInfo } = require('../providers/pm2/api')
const { validateAdminUser } = require('../services/admin.service')
const { readLogsReverse } = require('../utils/read-logs.util')
const { gitPull, gitClone } = require('../utils/git.util')
const { parseEnv, setEnvDataSyncAndBackup } = require('../utils/env.util')
const { isAuthenticated, checkAuthentication } = require('../middlewares/auth')
const AnsiConverter = require('ansi-to-html');
const ansiConvert = new AnsiConverter();
const fs = require('fs');
const path = require("path");
const si = require('systeminformation');
const apiRouter = require('./api');

const loginRateLimiter = RateLimit.middleware({
    interval: 2 * 60 * 1000, // 2 minutes
    max: 100,
    prefixKey: '/login' // to allow the bdd to Differentiate the endpoint 
});

// Serve index.html for SPA routes
const serveIndex = async (ctx) => {
    ctx.type = 'html';
    ctx.body = fs.createReadStream(path.join(__dirname, '../frontend/dist/index.html'));
};

router.get('/login', serveIndex);
router.get('/apps', serveIndex);
router.get('/apps/:appName', serveIndex);
router.get('/monitor', serveIndex);
router.get('/ports', serveIndex);
router.get('/git-clone', serveIndex);

// API routes (mostly handled by api.js, but some legacy ones here)
// We should probably move everything to api.js or keep them here but return JSON
// For now, I'll keep the API endpoints that return JSON, and remove/replace the ones that render views

// Legacy API endpoints (some return JSON, some redirect)

router.get('/api/apps/:appName/logs/:logType', isAuthenticated, async (ctx) => {
    const { appName, logType } = ctx.params
    const { linePerRequest, nextKey } = ctx.query
    if (logType !== 'stdout' && logType !== 'stderr') {
        return ctx.body = {
            'error': 'Log Type must be stdout or stderr'
        }
    }
    const app = await describeApp(appName)
    const filePath = logType === 'stdout' ? app.pm_out_log_path : app.pm_err_log_path
    let logs = await readLogsReverse({ filePath, nextKey })
    logs.lines = logs.lines.map(log => {
        return ansiConvert.toHtml(log)
    }).join('<br/>')
    return ctx.body = {
        logs
    };
});

router.post('/api/apps/:appName/reload', isAuthenticated, async (ctx) => {
    try {
        let { appName } = ctx.params
        let apps = await reloadApp(appName)
        if (Array.isArray(apps) && apps.length > 0) {
            // ctx.session.flash = { success: `Reload ${appName} successfully.` };
            return ctx.body = {
                success: true
            }
        }
        return ctx.body = {
            success: false
        }
    }
    catch (err) {
        return ctx.body = {
            'error': err
        }
    }
});

router.post('/api/apps/:appName/restart', isAuthenticated, async (ctx) => {
    try {
        let { appName } = ctx.params
        let apps = await restartApp(appName)
        if (Array.isArray(apps) && apps.length > 0) {
            // ctx.session.flash = { success: `Restart ${appName} successfully.` };
            return ctx.body = {
                success: true
            }
        }
        return ctx.body = {
            success: false
        }
    }
    catch (err) {
        console.log(err)
        return ctx.body = {
            'error': err
        }
    }
});

router.post('/api/apps/:appName/stop', isAuthenticated, async (ctx) => {
    try {
        let { appName } = ctx.params
        let apps = await stopApp(appName)
        if (Array.isArray(apps) && apps.length > 0) {
            // ctx.session.flash = { success: `Stop ${appName} successfully.` };
            return ctx.body = {
                success: true
            }
        }
        return ctx.body = {
            success: false
        }
    }
    catch (err) {
        return ctx.body = {
            'error': err
        }
    }
});

router.post('/api/apps/:appName/flush', isAuthenticated, async (ctx) => {
    try {
        let { appName } = ctx.params
        let apps = await flushApp(appName)
        if (Array.isArray(apps) && apps.length > 0) {
            // ctx.session.flash = { success: `Flush ${appName} successfully.` };
            return ctx.body = {
                success: true
            }
        }
        return ctx.body = {
            success: false
        }
    }
    catch (err) {
        return ctx.body = {
            'error': err
        }
    }
});

router.get('/apps/:appName/outlog/download', isAuthenticated, async (ctx) => {
    const { appName } = ctx.params;
    let app = await describeApp(appName);
    let fileName = app.pm_out_log_path;

    if (app) {
        try {
            if (fs.existsSync(fileName)) {
                ctx.body = fs.createReadStream(fileName);
                ctx.attachment(fileName);
            } else {
                ctx.throw(400, "Requested file not found on server");
            }
        } catch (error) {
            ctx.throw(500, error);
        }
    }
})

router.get('/apps/:appName/errorlog/download', isAuthenticated, async (ctx) => {
    const { appName } = ctx.params;
    let app = await describeApp(appName);
    let fileName = app.pm_err_log_path;
    if (app) {
        try {
            if (fs.existsSync(fileName)) {
                ctx.body = fs.createReadStream(fileName);
                ctx.attachment(fileName);
            } else {
                ctx.throw(400, "Requested file not found on server");
            }
        } catch (error) {
            ctx.throw(500, error);
        }
    }
})

router.get('/apps/:appName/customlog/download', isAuthenticated, async (ctx) => {
    const { appName } = ctx.params;
    let app = await describeApp(appName);
    if (app) {

        let custom_log_path = path.join(app.pm2_env_cwd, 'logs');
        let fileName = "";
        if (fs.existsSync(custom_log_path)) {
            log_path = fs.readdirSync(custom_log_path).filter((file) => fs.lstatSync(path.join(custom_log_path, file)).isFile())
                .map((file) => ({ file, mtime: fs.lstatSync(path.join(custom_log_path, file)).mtime }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            fileName = path.join(custom_log_path, log_path[0].file);

            try {
                if (fs.existsSync(fileName)) {
                    ctx.body = fs.createReadStream(fileName);
                    ctx.attachment(fileName);
                } else {
                    ctx.throw(400, "Requested file not found on server");
                }
            } catch (error) {
                ctx.throw(500, error);
            }
        }
    }
})

router.post('/api/apps/:appName/gitpull', isAuthenticated, async (ctx) => {
    const { appName } = ctx.params;
    let username = ctx.request.body.username || null;
    let password = ctx.request.body.password || null;
    let branch = ctx.request.body.branch || 'master';
    let app = await describeApp(appName);
    if (app && username && password) {
        await gitPull(appName, app.pm2_env_cwd, username, password, branch)
    }

    // return ctx.redirect('/apps/' + appName) // Redirects are for browser, API should return JSON
    return ctx.body = { success: true };
})

router.post('/gitClone', isAuthenticated, async (ctx) => {
    let gitCloneStatus = null;
    let gitUrl = ctx.request.body.giturl || '';
    let gitUsername = ctx.request.body.gitusername || '';
    let gitPassword = ctx.request.body.gitpassword || '';
    let tofolder = ctx.request.body.gitclonerename || '';
    let branch = ctx.request.body.branch || 'master';
    let envContent = ctx.request.body.envContent || '';
    let appName = ctx.request.body.appName || '';
    let startScript = ctx.request.body.startscript || 'server.js';
    if (gitUrl && gitUsername && gitPassword && envContent && startScript) {

        gitCloneStatus = await gitClone(gitUrl, gitUsername, gitPassword, tofolder, branch, envContent, appName, startScript);
        if (gitCloneStatus.status == 'success') {
            // ctx.session.flash = { success: gitCloneStatus.msg };
            return ctx.body = { success: true, msg: gitCloneStatus.msg };
        } else {
            // ctx.session.flash = { error: gitCloneStatus.msg };
            return ctx.body = { success: false, msg: gitCloneStatus.msg };
        }
    }

    // return ctx.redirect('/apps')
    return ctx.body = { success: false, msg: 'Missing parameters' };
})

router.get('/listenPorts', isAuthenticated, async (ctx) => {
    // This was rendering a view. We should probably return JSON now.
    // Or just redirect to SPA if accessed directly?
    // Let's return JSON for now or just serve SPA
    // return await ctx.render('apps/listenports', ...);
    return serveIndex(ctx);
})

router.post('/api/apps/:appName/updateEnv', isAuthenticated, async (ctx) => {
    const { appName } = ctx.params;
    let envContent = ctx.request.body.env_content || '';
    let app = await describeApp(appName);
    let status = null;
    if (app && envContent) {
        envContent = await parseEnv(envContent)
        status = await setEnvDataSyncAndBackup(app.pm2_env_cwd, appName, envContent);
        // ctx.session.flash = { success: `Update Environment file ${appName} updated successfully.` };
    }

    return ctx.body = {
        success: status
    }
})

router.get('/pm2Save', isAuthenticated, async (ctx) => {
    let pm2save = await pm2Save();
    if (pm2save.status == 'success') {
        // ctx.session.flash = { success: pm2save.msg };
        return ctx.body = { success: true, msg: pm2save.msg };
    } else {
        // ctx.session.flash = { error: pm2save.msg };
        return ctx.body = { success: false, msg: pm2save.msg };
    }

    // return ctx.redirect('/apps')
})

// Mount API routes under /api prefix
router.use('/api', apiRouter.routes(), apiRouter.allowedMethods());

// Catch all for other routes (except /api which is mounted later)
router.get('(.*)', async (ctx, next) => {
    if (ctx.path.startsWith('/api') || ctx.path.startsWith('/assets')) {
        await next();
        return;
    }
    await serveIndex(ctx);
});

module.exports = router;
