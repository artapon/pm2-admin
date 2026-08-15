const path = require('path')

// Anchor everything to the install directory instead of process.cwd(): PM2 keeps whatever
// cwd the app was started from (and restores it on resurrect), so a cwd-relative .env meant
// the app silently ignored the configured PORT and fell back to 4343, and created a second
// .env / data/database.sqlite next to wherever it happened to be launched.
const PROJECT_ROOT = path.resolve(__dirname, '../..')

require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') })

const config = {
    HOST: process.env.HOST || '127.0.0.1',
    PORT: process.env.PORT || 4343,
    APP_DIR: PROJECT_ROOT,
    APP_SESSION_SECRET: process.env.APP_SESSION_SECRET || null,
    APP_USERNAME: process.env.APP_USERNAME || null,
    APP_HTTP_MODE: (process.env.APP_HTTP_MODE || 'HTTP').toUpperCase(),
    CERT_KEY: process.env.CERT_KEY || 'cert.key',
    CERT_PATH: process.env.CERT_PATH || 'cert.crt',
    DEFAULTS: {
        LINES_PER_REQUEST: 50,
        BCRYPT_HASH_ROUNDS: 12,
    }
}

module.exports = config;