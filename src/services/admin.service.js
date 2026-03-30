const { db } = require('./db.service');
const { comparePassword } = require('../utils/password.util');
const { hashPasswordSync } = require('../utils/password.util');

/**
 * Validate user credentials against the SQLite database
 */
const validateAdminUser = async (username, password) => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) {
        throw new Error('User does not exist');
    }

    const isPasswordCorrect = await comparePassword(password, user.password);
    if (!isPasswordCorrect) {
        throw new Error('Password or Username is incorrect');
    }

    return user; // Returns user object with role
}

/**
 * Create or Update migration users from setup script
 */
const createAdminUser = (username, password, itusername, itpassword) => {
    const insertStmt = db.prepare('INSERT OR REPLACE INTO users (username, password, role) VALUES (?, ?, ?)');
    
    if (username && password) {
        const hash = hashPasswordSync(password);
        insertStmt.run(username, hash, 'root');
        console.log(`User ${username} set as root.`);
    }

    if (itusername && itpassword) {
        const ithash = hashPasswordSync(itpassword);
        insertStmt.run(itusername, ithash, 'support');
        console.log(`User ${itusername} set as support.`);
    }
}

module.exports = {
    validateAdminUser,
    createAdminUser
}