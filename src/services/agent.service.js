const http = require('http');
const https = require('https');
const { URL } = require('url');
const { decryptSecret } = require('../utils/secret.util');

// HTTP client for talking to a pm2-agent on another server.
//
// Deliberately built on the core http/https modules rather than a dependency: the whole
// surface is "exchange one JSON document with a token header", and the parts that actually
// matter here — a hard timeout, a response size cap, and never following a redirect — are
// things a general-purpose client would have to be configured out of anyway.

const DEFAULT_TIMEOUT_MS = 8000;
// An agent listing every process on a busy box is the largest legitimate response by far;
// beyond this something is wrong and streaming it into memory helps nobody.
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

class AgentError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.name = 'AgentError';
        // 502: the failure is the upstream agent's, not the caller's request to us.
        this.status = status;
    }
}

// Accepts only what an agent can actually be: an absolute http(s) origin. Embedded
// credentials are rejected rather than ignored, so a mistyped URL cannot silently send a
// password to a server as part of the request line.
const parseAgentUrl = (raw) => {
    let url;
    try {
        url = new URL(String(raw).trim());
    } catch {
        throw new AgentError('Agent URL is not a valid URL', 400);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new AgentError('Agent URL must start with http:// or https://', 400);
    }
    if (!url.hostname) throw new AgentError('Agent URL has no host', 400);
    if (url.username || url.password) {
        throw new AgentError('Agent URL must not contain credentials — use the agent token', 400);
    }
    return url;
};

// Joins the configured base URL with an agent path, keeping any base path prefix intact so
// an agent behind `https://host/pm2-agent/` works the same as one at the root.
const buildUrl = (baseUrl, agentPath, query) => {
    const url = parseAgentUrl(baseUrl);
    const base = url.pathname.replace(/\/+$/, '');
    url.pathname = base + (agentPath.startsWith('/') ? agentPath : `/${agentPath}`);
    url.search = '';
    for (const [k, v] of Object.entries(query || {})) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    return url;
};

// One request against an agent. Resolves with the parsed JSON body; rejects with an
// AgentError carrying a message fit to show in the UI.
const agentRequest = (target, agentPath, options = {}) => {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, query, method = 'GET', body } = options;
    const url = buildUrl(target.url, agentPath, query);
    const transport = url.protocol === 'https:' ? https : http;
    // Actions carry no payload today; send an explicit empty JSON body so the agent's
    // parser and any proxy in between see a well-formed request rather than a bare POST.
    const payload = method === 'GET' ? null : Buffer.from(JSON.stringify(body || {}), 'utf8');

    return new Promise((resolveRaw, rejectRaw) => {
        // Destroying the request on timeout or an oversized body fires 'error' with
        // ECONNRESET straight after — settle once so the first, accurate reason wins.
        let settled = false;
        const resolve = (v) => { if (!settled) { settled = true; resolveRaw(v); } };
        const reject = (e) => { if (!settled) { settled = true; rejectRaw(e); } };

        const req = transport.request(url, {
            method,
            headers: {
                'X-Agent-Token': target.token,
                'Accept': 'application/json',
                'User-Agent': 'pm2-admin',
                ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {})
            },
            // Self-signed certificates are the norm on an internal agent; the operator opts
            // into accepting them per environment rather than globally.
            rejectUnauthorized: url.protocol === 'https:' ? !target.allowInsecureTls : undefined
        }, (res) => {
            // Redirects are not followed: a redirect would replay the agent token at
            // whatever host the response names.
            if (res.statusCode >= 300 && res.statusCode < 400) {
                res.resume();
                return reject(new AgentError(`Agent returned a redirect (${res.statusCode}) — check the URL`));
            }

            let size = 0;
            const chunks = [];
            res.on('data', (chunk) => {
                size += chunk.length;
                if (size > MAX_RESPONSE_BYTES) {
                    req.destroy();
                    return reject(new AgentError('Agent response too large'));
                }
                chunks.push(chunk);
            });
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    // A proxy error page or a plain-HTML 404 lands here — say so rather than
                    // reporting a confusing JSON parse error.
                    return reject(new AgentError(
                        res.statusCode === 200
                            ? 'Agent returned a non-JSON response — is this really a pm2-agent?'
                            : `Agent returned HTTP ${res.statusCode}`
                    ));
                }

                if (res.statusCode === 401) return reject(new AgentError('Agent rejected the token', 401));
                if (res.statusCode === 403) return reject(new AgentError('Agent refused this server\'s IP', 403));
                if (res.statusCode === 404) return reject(new AgentError(parsed.error || 'Not found on agent', 404));
                if (res.statusCode === 429) return reject(new AgentError('Agent rate limit reached — slow down', 429));
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new AgentError(parsed.error || `Agent returned HTTP ${res.statusCode}`));
                }
                if (!parsed || parsed.success !== true) {
                    return reject(new AgentError(parsed?.error || 'Agent reported a failure'));
                }
                resolve(parsed.data);
            });
        });

        // Covers a silent agent as well as a slow one: without this a dropped route leaves
        // the dashboard request hanging until the client gives up.
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new AgentError(`Agent did not respond within ${Math.round(timeoutMs / 1000)}s`, 504));
        });

        req.on('error', (err) => {
            const map = {
                ECONNREFUSED: 'Connection refused — is the agent running?',
                ENOTFOUND: 'Host not found — check the agent URL',
                ETIMEDOUT: 'Connection timed out',
                EHOSTUNREACH: 'Host unreachable',
                ECONNRESET: 'Connection reset by the agent',
                CERT_HAS_EXPIRED: 'Agent TLS certificate has expired',
                DEPTH_ZERO_SELF_SIGNED_CERT: 'Agent uses a self-signed certificate — enable "Allow self-signed TLS" for it',
                SELF_SIGNED_CERT_IN_CHAIN: 'Agent uses a self-signed certificate — enable "Allow self-signed TLS" for it',
                ERR_TLS_CERT_ALTNAME_INVALID: 'Agent TLS certificate does not match the host name'
            };
            reject(new AgentError(map[err.code] || err.message || 'Could not reach the agent'));
        });

        req.end(payload || undefined);
    });
};

// The two shapes callers actually use. GET is the read-through proxy; POST/DELETE carry the
// app actions, which the agent may refuse outright when it runs read-only.
const agentGet = (target, agentPath, options = {}) =>
    agentRequest(target, agentPath, { ...options, method: 'GET' });

const agentSend = (target, agentPath, options = {}) =>
    agentRequest(target, agentPath, { ...options, method: options.method || 'POST' });

// Turns a stored DB row into the shape agentGet() expects, decrypting the token on the way.
// A token that will not decrypt is reported as a configuration problem, not a network one —
// it means APP_SESSION_SECRET changed since the environment was saved.
const targetFromRow = (row) => {
    let token;
    try {
        token = decryptSecret(row.token);
    } catch {
        throw new AgentError('Stored agent token could not be decrypted — edit this environment and enter it again', 409);
    }
    return {
        url: row.url,
        token,
        allowInsecureTls: !!row.allow_insecure_tls
    };
};

module.exports = {
    AgentError,
    DEFAULT_TIMEOUT_MS,
    parseAgentUrl,
    agentRequest,
    agentGet,
    agentSend,
    targetFromRow
};
