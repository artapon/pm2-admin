require('dotenv').config()

const config = {
    HOST: process.env.HOST || '127.0.0.1',
    PORT: process.env.PORT || 4343,
    APP_DIR: process.cwd(),
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