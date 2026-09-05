const { db } = require('../services/db.service');
const { encryptSecret } = require('../utils/secret.util');
const { AgentError, parseAgentUrl, agentGet, agentSend, targetFromRow } = require('../services/agent.service');
const { isValidAppName, countVisibleApps } = require('../utils/app-name.util');

// CRUD for the pm2-agent servers this dashboard reads, plus the proxy that forwards to
// them. Reads are open to any authenticated user; the app actions at the bottom (reload,
// restart, stop, reset, delete) are root-only on the routes here and can additionally be
// switched off at the agent with AGENT_ALLOW_ACTIONS=false.

const NAME_RE = /^[A-Za-z0-9 _.\-:()]{1,64}$/;
const DESCRIPTION_MAX = 256;
const TOKEN_MIN = 16;
const TOKEN_MAX = 512;
const URL_MAX = 512;
// Printable ASCII only — the token goes into an HTTP header, where a stray newline would
// be a header-injection vector and a non-ASCII byte is simply invalid.
const TOKEN_RE = /^[\x21-\x7E]+$/;

const isValidId = (id) => /^\d+$/.test(String(id));

// The overview fans out to every environment at once, so one unreachable server must not
// hold the whole page. Kept well under the client's own patience.
const OVERVIEW_TIMEOUT_MS = 5000;

const validateName = (name) => {
    if (typeof name !== 'string' || !NAME_RE.test(name.trim())) {
        throw new AgentError('Name must be 1-64 characters (letters, digits, space, _ . - : parentheses)', 400);
    }
    return name.trim();
};

const validateUrl = (url) => {
    if (typeof url !== 'string' || url.length > URL_MAX) {
        throw new AgentError('Agent URL is required', 400);
    }
    // Throws AgentError(400) with a specific reason for a bad scheme, host or credentials.
    const parsed = parseAgentUrl(url);
    // Normalise: strip a trailing slash so the same agent entered two ways is one URL.
    return parsed.toString().replace(/\/+$/, '');
};

const validateToken = (token) => {
    if (typeof token !== 'string' || token.length < TOKEN_MIN || token.length > TOKEN_MAX || !TOKEN_RE.test(token)) {
        throw new AgentError(`Agent token must be ${TOKEN_MIN}-${TOKEN_MAX} printable characters`, 400);
    }
    return token;
};

const validateDescription = (description) => {
    if (description === undefined || description === null) return '';
    if (typeof description !== 'string' || description.length > DESCRIPTION_MAX) {
        throw new AgentError(`Description must be at most ${DESCRIPTION_MAX} characters`, 400);
    }
    return description;
};

const toBit = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

// Every row that leaves this module goes through here — the token column must never reach
// the client, not even masked, and `has_token` is all the UI needs to render its state.
const publicRow = (row) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    allow_insecure_tls: !!row.allow_insecure_tls,
    enabled: !!row.enabled,
    has_token: !!row.token,
    created_at: row.created_at,
    updated_at: row.updated_at
});

const getRow = (id) => {
    if (!isValidId(id)) throw new AgentError('Invalid environment id', 400);
    const row = db.prepare('SELECT * FROM environments WHERE id = ?').get(id);
    if (!row) throw new AgentError('Environment not found', 404);
    return row;
};

// A disabled environment is one the operator has deliberately parked — reading from it would
// keep hammering a server they took out of rotation.
const getEnabledRow = (id) => {
    const row = getRow(id);
    if (!row.enabled) throw new AgentError('Environment is disabled', 409);
    return row;
};

// AgentError carries the status and a message meant for a human; anything else is ours and
// gets a generic 500 so an internal detail cannot leak through the proxy.
const fail = (res, error, fallback = 'Request failed') => {
    if (error instanceof AgentError) {
        return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Environment error:', error);
    return res.status(500).json({ success: false, error: fallback });
};

/* ── CRUD ──────────────────────────────────────────────────────────────────── */

const getAllEnvironments = async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM environments ORDER BY name COLLATE NOCASE').all();
        res.json({ success: true, data: rows.map(publicRow) });
    } catch (error) {
        fail(res, error, 'Failed to load environments');
    }
};

const getEnvironment = async (req, res) => {
    try {
        res.json({ success: true, data: publicRow(getRow(req.params.id)) });
    } catch (error) {
        fail(res, error, 'Failed to load environment');
    }
};

const createEnvironment = async (req, res) => {
    try {
        const { name, url, token, description, allow_insecure_tls, enabled } = req.body;

        const row = {
            name: validateName(name),
            url: validateUrl(url),
            token: encryptSecret(validateToken(token)),
            description: validateDescription(description),
            allow_insecure_tls: toBit(allow_insecure_tls),
            enabled: enabled === undefined ? 1 : toBit(enabled)
        };

        const result = db.prepare(`
            INSERT INTO environments (name, url, token, description, allow_insecure_tls, enabled)
            VALUES (@name, @url, @token, @description, @allow_insecure_tls, @enabled)
        `).run(row);

        res.json({ success: true, message: 'Environment created', data: { id: result.lastInsertRowid } });
    } catch (error) {
        if (error && String(error.message).includes('UNIQUE')) {
            return res.status(400).json({ success: false, error: 'An environment with that name already exists' });
        }
        fail(res, error, 'Failed to create environment');
    }
};

const updateEnvironment = async (req, res) => {
    try {
        const existing = getRow(req.params.id);
        const { name, url, token, description, allow_insecure_tls, enabled } = req.body;

        // An empty token means "keep the stored one" — the UI never receives the current
        // value, so it cannot send it back unchanged.
        const nextToken = (token === undefined || token === null || token === '')
            ? existing.token
            : encryptSecret(validateToken(token));

        db.prepare(`
            UPDATE environments
               SET name = @name, url = @url, token = @token, description = @description,
                   allow_insecure_tls = @allow_insecure_tls, enabled = @enabled,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = @id
        `).run({
            id: existing.id,
            name: validateName(name),
            url: validateUrl(url),
            token: nextToken,
            description: validateDescription(description),
            allow_insecure_tls: toBit(allow_insecure_tls),
            enabled: enabled === undefined ? existing.enabled : toBit(enabled)
        });

        res.json({ success: true, message: 'Environment updated' });
    } catch (error) {
        if (error && String(error.message).includes('UNIQUE')) {
            return res.status(400).json({ success: false, error: 'An environment with that name already exists' });
        }
        fail(res, error, 'Failed to update environment');
    }
};

const deleteEnvironment = async (req, res) => {
    try {
        const existing = getRow(req.params.id);
        db.prepare('DELETE FROM environments WHERE id = ?').run(existing.id);
        res.json({ success: true, message: 'Environment deleted' });
    } catch (error) {
        fail(res, error, 'Failed to delete environment');
    }
};

/* ── Connection test ───────────────────────────────────────────────────────── */

// Tests a saved environment, or — when the body carries a url — a candidate one, so the
// operator can verify an agent from the add dialog before committing it.
const testEnvironment = async (req, res) => {
    try {
        let target;
        if (req.params.id) {
            target = targetFromRow(getRow(req.params.id));
        } else {
            target = {
                url: validateUrl(req.body?.url),
                token: validateToken(req.body?.token),
                allowInsecureTls: toBit(req.body?.allow_insecure_tls) === 1
            };
        }

        const started = Date.now();
        // /health needs no token; /api/info proves the token is accepted too. Testing only
        // the first would call a wrong token a success.
        const health = await agentGet(target, '/health');
        const info = await agentGet(target, '/api/info');

        res.json({
            success: true,
            data: {
                reachable: true,
                latencyMs: Date.now() - started,
                pm2: health.pm2,
                agent: info.agent,
                host: info.host,
                node: info.node
            }
        });
    } catch (error) {
        // A failed test is a normal outcome to render, not a server error — answer 200 with
        // the reason so the dialog can show it inline.
        if (error instanceof AgentError) {
            return res.json({ success: true, data: { reachable: false, error: error.message } });
        }
        fail(res, error, 'Connection test failed');
    }
};

/* ── Overview ──────────────────────────────────────────────────────────────── */

// One row per enabled environment for the Environments page: app counts and load, or the
// reason the server could not be read. Never rejects for a single unreachable agent.
const getEnvironmentsOverview = async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM environments WHERE enabled = 1 ORDER BY name COLLATE NOCASE').all();

        const results = await Promise.all(rows.map(async (row) => {
            const base = publicRow(row);
            try {
                const target = targetFromRow(row);
                const [apps, monitor, info] = await Promise.all([
                    agentGet(target, '/api/apps', { timeoutMs: OVERVIEW_TIMEOUT_MS }),
                    agentGet(target, '/api/system/monitor', { timeoutMs: OVERVIEW_TIMEOUT_MS }),
                    agentGet(target, '/api/info', { timeoutMs: OVERVIEW_TIMEOUT_MS })
                ]);
                return {
                    ...base,
                    online: true,
                    // The agent counts every process PM2 knows about; the card next to this
                    // number links to a list that hides PM2's own modules, so the count is
                    // taken over the same set the user will see there.
                    counts: countVisibleApps(apps.apps),
                    node: apps.node,
                    cpu: monitor.cpu,
                    memory: monitor.memory,
                    host: info.host,
                    agent: info.agent
                };
            } catch (error) {
                return {
                    ...base,
                    online: false,
                    error: error instanceof AgentError ? error.message : 'Could not read this environment'
                };
            }
        }));

        res.json({ success: true, data: results });
    } catch (error) {
        fail(res, error, 'Failed to load environments overview');
    }
};

/* ── Read-through proxy ────────────────────────────────────────────────────── */

// Each proxy handler is the same shape: resolve the environment, forward one GET, hand back
// the agent's `data` untouched so the frontend can reuse the components it already has for
// local PM2 data.
const proxy = (agentPath, options = {}) => async (req, res) => {
    try {
        const target = targetFromRow(getEnabledRow(req.params.id));
        const path = typeof agentPath === 'function' ? agentPath(req) : agentPath;
        const query = options.query ? options.query(req) : undefined;
        const data = await agentGet(target, path, { query, timeoutMs: options.timeoutMs });
        res.json({ success: true, data });
    } catch (error) {
        fail(res, error, 'Failed to read from the agent');
    }
};

// App names reaching an agent are validated here as well as there — a bad name should cost
// a 400 from this server, not a round trip and a 400 from the remote one.
const assertAppName = (req) => {
    if (!isValidAppName(req.params.appName)) throw new AgentError('Invalid app name', 400);
    return encodeURIComponent(req.params.appName);
};

// Agent + host identity (name, OS, IP, Node version). Open to any authenticated user: it is
// the same class of information the local dashboard shows about this server.
const getEnvironmentInfo = proxy('/api/info');

const getEnvironmentApps = proxy('/api/apps');
const getEnvironmentApp = proxy((req) => `/api/apps/${assertAppName(req)}`);
const getEnvironmentAppDescribe = proxy((req) => `/api/apps/${assertAppName(req)}/describe`);

const getEnvironmentAppLogs = proxy(
    (req) => {
        const logType = req.params.logType;
        if (logType !== 'stdout' && logType !== 'stderr') {
            throw new AgentError('Log Type must be stdout or stderr', 400);
        }
        return `/api/apps/${assertAppName(req)}/logs/${logType}`;
    },
    { query: (req) => ({ nextKey: req.query.nextKey }) }
);

const getEnvironmentSystemInfo = proxy('/api/system/info');
const getEnvironmentMonitor = proxy('/api/system/monitor');
const getEnvironmentPorts = proxy('/api/system/ports');
// A remote process table walk is the slowest call the agent offers — give it room before
// declaring the agent unresponsive.
const getEnvironmentProcesses = proxy('/api/system/processes', { timeoutMs: 20000 });

/* ── App actions ───────────────────────────────────────────────────────────── */

// Mirrors the read proxy, but forwards a mutating request. PM2 commands are slower than a
// read — a restart on a busy box regularly takes several seconds — so these get their own
// timeout rather than the read default.
const ACTION_TIMEOUT_MS = 20000;

const action = (agentPath, { method = 'POST', body } = {}) => async (req, res) => {
    try {
        const target = targetFromRow(getEnabledRow(req.params.id));
        const path = typeof agentPath === 'function' ? agentPath(req) : agentPath;
        const data = await agentSend(target, path, {
            method,
            body: body ? body(req) : undefined,
            timeoutMs: ACTION_TIMEOUT_MS
        });
        res.json({ success: true, data });
    } catch (error) {
        fail(res, error, 'The agent could not run that action');
    }
};

const reloadEnvironmentApp = action((req) => `/api/apps/${assertAppName(req)}/reload`);
const restartEnvironmentApp = action((req) => `/api/apps/${assertAppName(req)}/restart`);
const stopEnvironmentApp = action((req) => `/api/apps/${assertAppName(req)}/stop`);
const resetEnvironmentApp = action((req) => `/api/apps/${assertAppName(req)}/reset`);
const flushEnvironmentApp = action((req) => `/api/apps/${assertAppName(req)}/flush`);
const deleteEnvironmentApp = action((req) => `/api/apps/${assertAppName(req)}`, { method: 'DELETE' });

// The app's .env on the remote machine. Reading it is root-only on the routes here for the
// same reason the local one is: it is where credentials live.
const getEnvironmentAppEnv = proxy((req) => `/api/apps/${assertAppName(req)}/env`);

const updateEnvironmentAppEnv = action(
    (req) => `/api/apps/${assertAppName(req)}/env`,
    {
        body: (req) => {
            const content = req.body?.env_content;
            if (typeof content !== 'string' || !content) {
                throw new AgentError('env_content is required', 400);
            }
            if (Buffer.byteLength(content, 'utf8') > 64 * 1024) {
                throw new AgentError('.env content too large', 413);
            }
            return { env_content: content };
        }
    }
);

module.exports = {
    getAllEnvironments,
    getEnvironment,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    testEnvironment,
    getEnvironmentsOverview,
    getEnvironmentInfo,
    getEnvironmentApps,
    getEnvironmentApp,
    getEnvironmentAppDescribe,
    getEnvironmentAppLogs,
    getEnvironmentSystemInfo,
    getEnvironmentMonitor,
    getEnvironmentPorts,
    getEnvironmentProcesses,
    reloadEnvironmentApp,
    restartEnvironmentApp,
    stopEnvironmentApp,
    resetEnvironmentApp,
    flushEnvironmentApp,
    deleteEnvironmentApp,
    getEnvironmentAppEnv,
    updateEnvironmentAppEnv
};
