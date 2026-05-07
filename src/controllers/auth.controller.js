const { validateAdminUser } = require('../services/admin.service');
const config = require('../config');
const { db } = require('../services/db.service');
const bcrypt = require('bcryptjs');
const path = require('path');
const { getEnvDataSync, setEnvDataSync } = require('../utils/env.util');
const { BCRYPT_HASH_ROUNDS } = config.DEFAULTS;

const APP_DIR = path.resolve(__dirname, '../..');

const SETUP_ENV_VALIDATORS = {
    HOST:          (v) => /^[\w.\-]{1,64}$/.test(v),
    PORT:          (v) => /^\d{1,5}$/.test(v) && parseInt(v) >= 1 && parseInt(v) <= 65535,
    APP_ENV:       (v) => /^[A-Za-z0-9 _\-]{1,32}$/.test(v),
    APP_HTTP_MODE: (v) => v === 'HTTP' || v === 'HTTPS',
    CERT_KEY:      (v) => /^[A-Za-z0-9_./\\\-:]{1,256}$/.test(v),
    CERT_PATH:     (v) => /^[A-Za-z0-9_./\\\-:]{1,256}$/.test(v),
};

const USERNAME_RE = /^[A-Za-z0-9_.\-]{3,64}$/;
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;

const isValidUsername = (u) => typeof u === 'string' && USERNAME_RE.test(u);
const isValidPassword = (p) => typeof p === 'string' && p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX;

const checkSetupRequired = async (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    res.json({ success: true, setupRequired: userCount === 0 });
};

const getSetupEnvConfig = async (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    try {
        const envData = getEnvDataSync(path.join(APP_DIR, '.env'));
        res.json({
            success: true,
            data: {
                HOST:          envData.HOST          || '127.0.0.1',
                PORT:          envData.PORT          || '4343',
                APP_ENV:       envData.APP_ENV       || 'Production',
                APP_HTTP_MODE: envData.APP_HTTP_MODE || 'HTTP',
                CERT_KEY:      envData.CERT_KEY      || 'cert.key',
                CERT_PATH:     envData.CERT_PATH     || 'cert.crt',
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const setupInitialRootUser = async (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) {
        return res.status(400).json({ success: false, error: 'Initial setup already completed' });
    }

    const { username, password } = req.body;
    if (!isValidUsername(username)) {
        return res.status(400).json({ success: false, error: 'Invalid username (3-64 chars, alphanumeric/._-)' });
    }
    if (!isValidPassword(password)) {
        return res.status(400).json({ success: false, error: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` });
    }

    const hash = await bcrypt.hash(password, BCRYPT_HASH_ROUNDS);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, 'root');

    const { envConfig } = req.body;
    if (envConfig && typeof envConfig === 'object') {
        const safeEnv = {};
        for (const [key, validate] of Object.entries(SETUP_ENV_VALIDATORS)) {
            const val = envConfig[key];
            if (val !== undefined && val !== null && val !== '' && validate(String(val))) {
                safeEnv[key] = String(val);
            }
        }
        if (Object.keys(safeEnv).length > 0) {
            try {
                setEnvDataSync(APP_DIR, safeEnv);
            } catch (err) {
                console.error('Failed to update .env during setup:', err);
            }
        }
    }

    res.json({ success: true, message: 'Initial root user created successfully' });
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }
        if (username.length > 64 || password.length > PASSWORD_MAX) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        let user;
        try {
            user = await validateAdminUser(username, password);
        } catch {
            // Generic error to avoid username enumeration
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Regenerate session to prevent session fixation
        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ success: false, error: 'Login failed' });

            req.session.isAuthenticated = true;
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.username === config.APP_USERNAME ? 'root' : (user.role || 'user');

            req.session.save((saveErr) => {
                if (saveErr) return res.status(500).json({ success: false, error: 'Login failed' });
                res.json({
                    success: true,
                    message: 'Login successful',
                    data: { username: req.session.username, role: req.session.role }
                });
            });
        });
    } catch {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
};

const logout = async (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('app_sess');
        res.json({ success: true, message: 'Logout successful' });
    });
};

const getSession = async (req, res) => {
    if (req.session.isAuthenticated) {
        let role = req.session.role;
        if (req.session.username === config.APP_USERNAME) role = 'root';

        res.json({
            success: true,
            data: {
                isAuthenticated: true,
                userId: req.session.userId || null,
                username: req.session.username,
                role
            }
        });
    } else {
        res.json({
            success: true,
            data: { isAuthenticated: false, username: null }
        });
    }
};

module.exports = { login, logout, getSession, checkSetupRequired, setupInitialRootUser, getSetupEnvConfig };
