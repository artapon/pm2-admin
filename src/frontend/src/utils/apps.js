// PM2's own modules — pm2-logrotate, pm2-server-monit and friends — are installed with
// `pm2 install` and always carry a `pm2-` prefix. They are part of the plumbing rather than
// something somebody deployed, so every app list in the dashboard hides them and the
// Plugins page is where they are shown instead.
//
// This lived as a `startsWith('pm2-')` in each view that needed it. One definition means
// the local dashboard and a remote environment cannot disagree about what an app is.
export const PM2_MODULE_PREFIX = 'pm2-'

// Accepts an app object or a bare name, so it can be used on either side of a filter.
export const isPm2Module = (app) => {
    const name = typeof app === 'string' ? app : app?.name
    return typeof name === 'string' && name.startsWith(PM2_MODULE_PREFIX)
}

export const visibleApps = (apps) => (apps || []).filter(app => !isPm2Module(app))

export const pm2Modules = (apps) => (apps || []).filter(isPm2Module)

// Status tallies for a list that has already been filtered. Deriving them here rather than
// reading the agent's own counts is the point: the agent counts every process it can see,
// including the modules the list above hides, and a card reading "7 total" above a table of
// four rows is just wrong.
export const countByStatus = (apps) => {
    const counts = { online: 0, stopped: 0, errored: 0, total: 0 }
    for (const app of apps || []) {
        counts.total++
        if (app.status === 'online') counts.online++
        else if (app.status === 'stopped') counts.stopped++
        else if (app.status === 'errored') counts.errored++
    }
    return counts
}
