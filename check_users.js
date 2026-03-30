const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath);
    const users = db.prepare('SELECT id, username, role FROM users').all();
    console.log('Current Users in Database:');
    console.table(users);
} else {
    console.log('Database file not found at: ' + dbPath);
}
