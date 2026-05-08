#!/usr/bin/env node

// Silence DEP0044 (util.isArray) emitted by pm2 internals — the function still works correctly.
// Primary: replace the property on the shared module object before pm2 loads.
// A simple assignment silently fails in Node ≥22 where the property may be non-configurable,
// so use Object.defineProperty instead.
try {
    Object.defineProperty(require('util'), 'isArray', {
        value: Array.isArray, writable: true, enumerable: true, configurable: true,
    });
} catch (_) {}
// Secondary: filter via process.emitWarning for any Node build where the above cannot patch it.
const _origEmitWarning = process.emitWarning.bind(process);
process.emitWarning = function (warning, ...rest) {
    if ((rest[0]?.code ?? rest[1]) === 'DEP0044') return;
    _origEmitWarning(warning, ...rest);
};

const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const { setEnvDataSync } = require('./utils/env.util');
const { generateRandomString } = require('./utils/random.util');
const { initDb, SQLiteStore } = require('./services/db.service');

// Init Database
initDb();

// Auto-generate session secret if missing
if (!config.APP_SESSION_SECRET) {
    const randomString = generateRandomString();
    setEnvDataSync(config.APP_DIR, { APP_SESSION_SECRET: randomString });
    config.APP_SESSION_SECRET = randomString;
}

const app = express();

// trust proxy: required for `secure` cookie + correct rate-limit IPs behind a reverse proxy
app.set('trust proxy', 1);
// Hide Express fingerprint
app.disable('x-powered-by');

const isProd = process.env.NODE_ENV === 'production';
const isHttpsMode = config.APP_HTTP_MODE === 'HTTPS';
// Allow operators to force secure cookies / HSTS even when NODE_ENV is unset behind TLS
const forceHttps = process.env.FORCE_HTTPS === 'true';
const useSecureCookie = isProd || forceHttps || isHttpsMode;

// helmet — comprehensive security headers (CSP, HSTS, COOP, X-Frame-Options, etc.)
// CSP is tuned for a Vite-built Vue SPA: 'self' for scripts, 'unsafe-inline' allowed for
// styles only (Vuetify injects runtime styles), no eval, no remote scripts.
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: useSecureCookie ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false, // SPA assets break otherwise; mTLS not relied upon here
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: useSecureCookie
        ? { maxAge: 63072000, includeSubDomains: true, preload: true }
        : false,
}));

// Body parsing — keep limits tight; .env updates have their own per-route 64KB cap
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Session
app.use(session({
    name: 'app_sess',
    secret: config.APP_SESSION_SECRET,
    store: new SQLiteStore(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: 'strict',
        secure: useSecureCookie,
        path: '/',
    }
}));

// Cache control for API responses — never cache authenticated API data
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend', 'dist'), {
    maxAge: isProd ? '7d' : 0,
    etag: true,
    setHeaders: (res, filePath) => {
        // index.html must never be cached aggressively
        if (path.basename(filePath) === 'index.html') {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

// Routes
const router = require('./routes');
app.use(router);

// 404 for /api with JSON; SPA already handled by routes
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

// Centralized error handler — never leak stack traces or raw error messages
app.use((err, req, res, next) => {
    // express-rate-limit and similar may set statusCode
    const status = err.status || err.statusCode || 500;
    if (!isProd) console.error('Unhandled error:', err);
    if (req.originalUrl.startsWith('/api')) {
        return res.status(status).json({ success: false, error: status === 500 ? 'Internal server error' : err.message });
    }
    res.status(status).send(status === 500 ? 'Internal server error' : err.message);
});

if (isHttpsMode) {
    const certKeyPath = path.isAbsolute(config.CERT_KEY)
        ? config.CERT_KEY
        : path.join(config.APP_DIR, config.CERT_KEY);
    const certCrtPath = path.isAbsolute(config.CERT_PATH)
        ? config.CERT_PATH
        : path.join(config.APP_DIR, config.CERT_PATH);

    let key, cert;
    try {
        key  = fs.readFileSync(certKeyPath);
        cert = fs.readFileSync(certCrtPath);
    } catch (err) {
        console.error(`[HTTPS] Failed to read certificate files: ${err.message}`);
        console.error(`  CERT_KEY  : ${certKeyPath}`);
        console.error(`  CERT_PATH : ${certCrtPath}`);
        process.exit(1);
    }

    https.createServer({ key, cert }, app).listen(config.PORT, config.HOST, () => {
        console.log(`Application started at https://${config.HOST}:${config.PORT}`);
    });
} else {
    http.createServer(app).listen(config.PORT, config.HOST, () => {
        console.log(`Application started at http://${config.HOST}:${config.PORT}`);
    });
}
