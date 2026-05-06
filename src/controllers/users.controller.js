const { db } = require('../services/db.service');
const bcrypt = require('bcryptjs');
const { comparePassword } = require('../utils/password.util');
const config = require('../config');

const HASH_ROUNDS = config.DEFAULTS.BCRYPT_HASH_ROUNDS;
const USERNAME_RE = /^[A-Za-z0-9_.\-]{3,64}$/;
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;
const ALLOWED_ROLES = new Set(['root', 'user', 'support']);

const isValidUsername = (u) => typeof u === 'string' && USERNAME_RE.test(u);
const isValidPassword = (p) => typeof p === 'string' && p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX;
const isValidRole = (r) => ALLOWED_ROLES.has(r);
const isValidId = (id) => /^\d+$/.test(String(id));

const getAllUsers = async (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id DESC').all();
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!isValidUsername(username)) {
            return res.status(400).json({ success: false, error: 'Invalid username (3-64 chars, alphanumeric/._-)' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ success: false, error: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` });
        }
        if (!isValidRole(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        const hashedPassword = await bcrypt.hash(password, HASH_ROUNDS);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role);

        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message.includes('UNIQUE') ? 'Username already exists' : 'Failed to create user'
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }
        if (!isValidUsername(username)) {
            return res.status(400).json({ success: false, error: 'Invalid username' });
        }
        if (!isValidRole(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        if (password) {
            if (!isValidPassword(password)) {
                return res.status(400).json({ success: false, error: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` });
            }
            const hashedPassword = await bcrypt.hash(password, HASH_ROUNDS);
            db.prepare('UPDATE users SET username = ?, password = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(username, hashedPassword, role, id);
            // Invalidate any active sessions for this user (force re-login)
            invalidateUserSessions(id);
        } else {
            db.prepare('UPDATE users SET username = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(username, role, id);
        }

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(400).json({ success: false, error: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }
        if (String(id) === '1') {
            return res.status(403).json({ success: false, error: 'User ID 1 cannot be deleted' });
        }
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        invalidateUserSessions(id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(400).json({ success: false, error: 'Failed to delete user' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }
        if (!req.session.userId || String(req.session.userId) !== String(id)) {
            return res.status(403).json({ success: false, error: 'You can only change your own password' });
        }
        if (typeof currentPassword !== 'string' || !currentPassword) {
            return res.status(400).json({ success: false, error: 'Current password is required' });
        }
        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ success: false, error: `New password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, error: 'New password must differ from current password' });
        }

        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const valid = await comparePassword(currentPassword, user.password);
        if (!valid) return res.status(400).json({ success: false, error: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, HASH_ROUNDS);
        db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, id);

        // Invalidate the current session — force user to log in again with new password
        req.session.destroy(() => {
            res.clearCookie('app_sess');
            res.json({ success: true, message: 'Password changed. Please log in again.' });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
};

// Best-effort session invalidation: scan SQLite session store for sessions
// belonging to this userId and delete them.
function invalidateUserSessions(userId) {
    try {
        const rows = db.prepare('SELECT sid, data FROM sessions').all();
        const stmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
        for (const row of rows) {
            try {
                const parsed = JSON.parse(row.data);
                if (parsed && String(parsed.userId) === String(userId)) {
                    stmt.run(row.sid);
                }
            } catch { /* skip malformed */ }
        }
    } catch { /* non-fatal */ }
}

module.exports = { getAllUsers, createUser, updateUser, deleteUser, changePassword };
