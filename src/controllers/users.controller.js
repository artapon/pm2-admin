const { db } = require('../services/db.service');
const { hashPasswordSync } = require('../utils/password.util');

/**
 * Get all users
 */
const getAllUsers = async (ctx) => {
    try {
        const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id DESC').all();
        ctx.body = {
            success: true,
            data: users
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Create a user
 */
const createUser = async (ctx) => {
    try {
        const { username, password, role } = ctx.request.body;
        
        if (!username || !password || !role) {
            ctx.status = 400;
            ctx.body = { success: false, error: 'Username, password and role are required' };
            return;
        }

        const hashedPassword = hashPasswordSync(password);
        
        const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        stmt.run(username, hashedPassword, role);

        ctx.body = {
            success: true,
            message: 'User created successfully'
        };
    } catch (error) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            error: error.message.includes('UNIQUE') ? 'Username already exists' : error.message
        };
    }
};

/**
 * Update user
 */
const updateUser = async (ctx) => {
    try {
        const { id } = ctx.params;
        const { username, password, role } = ctx.request.body;
        
        if (password) {
            const hashedPassword = hashPasswordSync(password);
            const stmt = db.prepare('UPDATE users SET username = ?, password = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            stmt.run(username, hashedPassword, role, id);
        } else {
            const stmt = db.prepare('UPDATE users SET username = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            stmt.run(username, role, id);
        }

        ctx.body = {
            success: true,
            message: 'User updated successfully'
        };
    } catch (error) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete user
 */
const deleteUser = async (ctx) => {
    try {
        const { id } = ctx.params;
        
        // Prevent deleting self? (optional)
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(id);

        ctx.body = {
            success: true,
            message: 'User deleted successfully'
        };
    } catch (error) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
};
