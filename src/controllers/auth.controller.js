const { validateAdminUser } = require('../services/admin.service');
const config = require('../config');
const { db } = require('../services/db.service');
const bcrypt = require('bcryptjs');
const { BCRYPT_HASH_ROUNDS } = config.DEFAULTS;

const checkSetupRequired = async (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    res.json({ success: true, setupRequired: userCount === 0 });
};

const setupInitialRootUser = async (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) {
        return res.status(400).json({ success: false, error: 'Initial setup already completed' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    if (username.length > 64 || password.length > 128) {
        return res.status(400).json({ success: false, error: 'Input too long' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_HASH_ROUNDS);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, 'root');

    res.json({ success: true, message: 'Initial root user created successfully' });
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }
        if (username.length > 64 || password.length > 128) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = await validateAdminUser(username, password);
        req.session.isAuthenticated = true;
        req.session.username = username;
        req.session.role = username === config.APP_USERNAME ? 'root' : (user.role || 'user');

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                username: req.session.username,
                role: req.session.role
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
};

const logout = async (req, res) => {
    req.session.destroy(() => {
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

module.exports = { login, logout, getSession, checkSetupRequired, setupInitialRootUser };
