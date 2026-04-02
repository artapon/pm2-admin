const Database = require('better-sqlite3');
const { Store } = require('express-session');
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
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

        CREATE TABLE IF NOT EXISTS sessions (
            sid TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);

    // Migration: Rename 'admin' role to 'root'
    try {
        const updateRootStmt = db.prepare("UPDATE users SET role = 'root' WHERE role = 'admin'");
        const resRoot = updateRootStmt.run();
        if (resRoot.changes > 0) {
            console.log(`Migrated ${resRoot.changes} users from 'admin' to 'root' role.`);
        }
    } catch (err) {
        console.error(`Failed to update roles: ${err.message}`);
    }
}

class SQLiteStore extends Store {
    constructor() {
        super();
        // Purge expired sessions once an hour
        setInterval(() => {
            db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
        }, 60 * 60 * 1000).unref();
    }

    get(sid, cb) {
        try {
            const row = db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid);
            if (!row) return cb(null, null);
            if (row.expires_at < Date.now()) {
                db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
                return cb(null, null);
            }
            return cb(null, JSON.parse(row.data));
        } catch (err) { return cb(err); }
    }

    set(sid, session, cb) {
        try {
            const expires = session.cookie?.expires
                ? new Date(session.cookie.expires).getTime()
                : Date.now() + 7 * 24 * 60 * 60 * 1000;
            db.prepare('INSERT OR REPLACE INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)')
                .run(sid, JSON.stringify(session), expires);
            return cb(null);
        } catch (err) { return cb(err); }
    }

    destroy(sid, cb) {
        try {
            db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
            return cb(null);
        } catch (err) { return cb(err); }
    }

    touch(sid, session, cb) {
        this.set(sid, session, cb);
    }
}

module.exports = {
    db,
    initDb,
    SQLiteStore
};
