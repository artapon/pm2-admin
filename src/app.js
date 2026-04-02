#!/usr/bin/env node

const express = require('express');
const session = require('express-session');
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

app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.removeHeader('X-Powered-By');
    next();
});

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session
app.use(session({
    name: 'app_sess',
    secret: config.APP_SESSION_SECRET,
    store: new SQLiteStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: 'strict',
        rolling: true,
    }
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Routes
const router = require('./routes');
app.use(router);

app.listen(config.PORT, config.HOST, () => {
    console.log(`Application started at http://${config.HOST}:${config.PORT}`);
});
