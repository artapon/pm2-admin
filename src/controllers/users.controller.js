const { db } = require('../services/db.service');
const bcrypt = require('bcryptjs');
const { comparePassword } = require('../utils/password.util');
const HASH_ROUNDS = 10;

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

        if (!username || !password || !role) {
            return res.status(400).json({ success: false, error: 'Username, password and role are required' });
        }

        const hashedPassword = await bcrypt.hash(password, HASH_ROUNDS);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role);

        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message.includes('UNIQUE') ? 'Username already exists' : error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, HASH_ROUNDS);
            db.prepare('UPDATE users SET username = ?, password = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(username, hashedPassword, role, id);
        } else {
            db.prepare('UPDATE users SET username = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(username, role, id);
        }

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (String(id) === '1') {
            return res.status(403).json({ success: false, error: 'User ID 1 cannot be deleted' });
        }
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (String(req.session.user.id) !== String(id)) {
            return res.status(403).json({ success: false, error: 'You can only change your own password' });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        }

        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const valid = await comparePassword(currentPassword, user.password);
        if (!valid) return res.status(400).json({ success: false, error: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, HASH_ROUNDS);
        db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, id);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser, changePassword };
