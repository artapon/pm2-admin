const crypto = require('crypto');
const config = require('../config');

// Encrypts secrets that must be stored *recoverable* — agent tokens have to be replayed to
// the remote agent on every call, so hashing them (as passwords are) is not an option.
//
// What this buys: a copy of data/database.sqlite alone — a stray backup, a support dump —
// does not hand over every monitored server. What it does NOT buy: protection from anyone
// who can read the whole install directory, since the key derives from APP_SESSION_SECRET
// in .env. Treat the .env as the real secret.
//
// AES-256-GCM: the auth tag makes a tampered or truncated ciphertext fail loudly instead of
// decrypting to garbage that would then be sent to an agent as a token.

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const PREFIX = 'v1';
// Fixed salt: the key must be re-derivable across restarts, and the entropy that matters
// lives in APP_SESSION_SECRET (32+ random chars), not here.
const SALT = 'pm2-admin/environments';

let cachedKey = null;

// Derived lazily, never at module load: app.js generates APP_SESSION_SECRET on first run and
// assigns it to config *after* the controllers have been required.
const getKey = () => {
    if (cachedKey) return cachedKey;
    if (!config.APP_SESSION_SECRET) {
        throw new Error('APP_SESSION_SECRET is not set — cannot encrypt stored secrets');
    }
    cachedKey = crypto.scryptSync(config.APP_SESSION_SECRET, SALT, 32);
    return cachedKey;
};

const encryptSecret = (plaintext) => {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [PREFIX, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
};

// Throws on any tampering, on a wrong key (APP_SESSION_SECRET was changed or regenerated),
// and on a value that was never encrypted. Callers turn this into "re-enter the token"
// rather than silently sending a broken credential over the network.
const decryptSecret = (stored) => {
    if (typeof stored !== 'string') throw new Error('Stored secret is not readable');
    const parts = stored.split(':');
    if (parts.length !== 4 || parts[0] !== PREFIX) {
        throw new Error('Stored secret is not in the expected format');
    }
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
};

module.exports = { encryptSecret, decryptSecret };
