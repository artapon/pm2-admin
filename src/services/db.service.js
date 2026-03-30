const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');
const fs = require('fs');

// Ensure the data directory exists
const dbPath = path.join(config.APP_DIR, 'data', 'database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database
const initDb = () => {
    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Check if users table is empty
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    if (usersCount === 0) {
        console.log('Users table is empty, migrating admin users from .env...');
        
        const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        
        if (config.APP_USERNAME && config.APP_PASSWORD) {
            try {
                insertUser.run(config.APP_USERNAME, config.APP_PASSWORD, 'root');
                console.log(`Migrated root user: ${config.APP_USERNAME}`);
            } catch (err) {
                console.error(`Failed to migrate ${config.APP_USERNAME}: ${err.message}`);
            }
        }

        if (config.IT_APP_USERNAME && config.IT_APP_PASSWORD) {
            try {
                // Change itadmin to support (view only)
                insertUser.run(config.IT_APP_USERNAME, config.IT_APP_PASSWORD, 'support');
                console.log(`Migrated support user: ${config.IT_APP_USERNAME}`);
            } catch (err) {
                console.error(`Failed to migrate ${config.IT_APP_USERNAME}: ${err.message}`);
            }
        }
    } else {
        // Migration: Rename 'admin' role to 'root'
        try {
            const updateRootStmt = db.prepare("UPDATE users SET role = 'root' WHERE role = 'admin'");
            const resRoot = updateRootStmt.run();
            if (resRoot.changes > 0) {
                console.log(`Migrated ${resRoot.changes} users from 'admin' to 'root' role.`);
            }
            
            // Re-ensure itadmin is support (just in case)
            const updateSuppStmt = db.prepare("UPDATE users SET role = 'support' WHERE role = 'itadmin'");
            const resSupp = updateSuppStmt.run();
            if (resSupp.changes > 0) {
                console.log(`Migrated ${resSupp.changes} users from 'itadmin' to 'support' role.`);
            }
        } catch (err) {
            console.error(`Failed to update roles: ${err.message}`);
        }
    }
}

module.exports = {
    db,
    initDb
};
