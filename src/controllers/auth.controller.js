const { validateAdminUser } = require('../services/admin.service');
const config = require('../config');
const { db } = require('../services/db.service');
const { hashPasswordSync } = require('../utils/password.util');

/**
 * Check if initial setup is required (no users exist)
 */
const checkSetupRequired = async (ctx) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    ctx.body = {
        success: true,
        setupRequired: userCount === 0
    };
};

/**
 * Perform initial setup
 */
const setupInitialRootUser = async (ctx) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) {
        ctx.status = 400;
        ctx.body = { success: false, error: 'Initial setup already completed' };
        return;
    }

    const { username, password } = ctx.request.body;
    if (!username || !password) {
        ctx.status = 400;
        ctx.body = { success: false, error: 'Username and password are required' };
        return;
    }

    const hash = hashPasswordSync(password);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
        .run(username, hash, 'root');

    ctx.body = {
        success: true,
        message: 'Initial root user created successfully'
    };
};

/**
 * Login
 */
const login = async (ctx) => {
    try {
        const { username, password } = ctx.request.body;
        
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Username and password are required'
            };
            return;
        }

        const user = await validateAdminUser(username, password);
        ctx.session.isAuthenticated = true;
        ctx.session.username = username;
        
        // Robust role assignment
        if (username === config.APP_USERNAME) {
            ctx.session.role = 'root';
        } else {
            ctx.session.role = user.role || 'user';
        }

        ctx.body = {
            success: true,
            message: 'Login successful',
            data: {
                username: ctx.session.username,
                role: ctx.session.role
            }
        };
    } catch (error) {
        ctx.status = 401;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Logout
 */
const logout = async (ctx) => {
    ctx.session = null;
    ctx.body = {
        success: true,
        message: 'Logout successful'
    };
};

/**
 * Get current session
 */
const getSession = async (ctx) => {
    if (ctx.session.isAuthenticated) {
        // Double check role fallback in session refresh
        let role = ctx.session.role;
        if (ctx.session.username === config.APP_USERNAME) {
            role = 'root';
        }

        ctx.body = {
            success: true,
            data: {
                isAuthenticated: true,
                username: ctx.session.username,
                role: role
            }
        };
    } else {
        ctx.body = {
            success: true,
            data: {
                isAuthenticated: false,
                username: null
            }
        };
    }
};

module.exports = {
    login,
    logout,
    getSession,
    checkSetupRequired,
    setupInitialRootUser
};


