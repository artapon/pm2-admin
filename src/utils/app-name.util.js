// One definition of what a PM2 process identifier may look like. This lived as three
// separate copies (routes, controller, PM2 provider); the routes copy drifted and lost the
// comma, which broke log downloads for multi-port apps like `lis-interface-service:8198,8199`.
// Every layer that accepts an app name from a request validates through here.
const APP_NAME_RE = /^[A-Za-z0-9_.,:\-]{1,128}$/;

const isValidAppName = (n) => typeof n === 'string' && APP_NAME_RE.test(n);

// PM2's own modules — pm2-logrotate, pm2-server-monit and friends — are installed with
// `pm2 install` and always carry a `pm2-` prefix. The dashboard hides them from every app
// list (the Plugins page is where they are shown), so anything that reports app counts has
// to agree about which processes those lists contain.
const PM2_MODULE_PREFIX = 'pm2-';

const isPm2Module = (app) => {
    const name = typeof app === 'string' ? app : (app && app.name);
    return typeof name === 'string' && name.startsWith(PM2_MODULE_PREFIX);
};

// Status tallies for the apps a user actually sees, modules excluded.
const countVisibleApps = (apps) => {
    const counts = { online: 0, stopped: 0, errored: 0, total: 0 };
    for (const app of apps || []) {
        if (isPm2Module(app)) continue;
        counts.total++;
        if (app.status === 'online') counts.online++;
        else if (app.status === 'stopped') counts.stopped++;
        else if (app.status === 'errored') counts.errored++;
    }
    return counts;
};

module.exports = {
    APP_NAME_RE,
    isValidAppName,
    PM2_MODULE_PREFIX,
    isPm2Module,
    countVisibleApps
};
