const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/knex');
const { clientIp, countryCode } = require('../utils/http');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set');
}

const JWT_SECRET = process.env.JWT_SECRET;
const ACTIVE_SESSION_HOURS = 24;
const MAX_ACTIVE_DEVICES = 2;
let sessionsTableSupported = null;

const hasSessionsTable = async () => {
    if (sessionsTableSupported !== null) return sessionsTableSupported;
    sessionsTableSupported = await db.schema.hasTable('user_sessions');
    return sessionsTableSupported;
};

const deviceHashFor = (req) => crypto
    .createHash('sha256')
    .update(req.headers['user-agent'] || 'unknown')
    .digest('hex');

const trackSession = async (req, res) => {
    if (!(await hasSessionsTable())) return true;

    const userId = Number(req.user.id);
    const deviceHash = deviceHashFor(req);
    const cutoffPercentage = 1.0; // Keep track of active window
    const cutoff = db.raw(`DATE_SUB(NOW(), INTERVAL ${ACTIVE_SESSION_HOURS} HOUR)`);

    // Use a transaction for atomic check-and-insert
    return await db.transaction(async (trx) => {
        const existing = await trx('user_sessions')
            .where({ user_id: userId, device_hash: deviceHash })
            .first();

        // If it's a new device/hash for this user, check limits
        if (!existing) {
            const activeDevices = await trx('user_sessions')
                .where({ user_id: userId })
                .where('last_seen', '>', cutoff)
                .countDistinct({ count: 'device_hash' })
                .first();

            if (Number(activeDevices?.count || 0) >= MAX_ACTIVE_DEVICES) {
                return res.status(429).json({
                    error: 'Maximum active devices reached. Please sign out from another device or wait for old sessions to expire.'
                });
            }

            await trx('user_sessions').insert({
                user_id: userId,
                ip_address: clientIp(req),
                user_agent: req.headers['user-agent'] || '',
                device_hash: deviceHash,
                country_code: countryCode(req),
                last_seen: trx.raw('NOW()')
            }).onConflict(['user_id', 'device_hash']).merge({
                ip_address: clientIp(req),
                user_agent: req.headers['user-agent'] || '',
                country_code: countryCode(req),
                last_seen: trx.raw('NOW()')
            });
        } else {
            // Existing device, just update last_seen
            await trx('user_sessions')
                .where({ id: existing.id })
                .update({
                    ip_address: clientIp(req),
                    user_agent: req.headers['user-agent'] || '',
                    country_code: countryCode(req),
                    last_seen: trx.raw('NOW()'),
                });
        }
        return true;
    }).catch(error => {
        if (error.code === 'ER_DUP_ENTRY') return true; // Handled by onConflict but just in case
        throw error;
    });
};

const authenticate = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Adds user info (id, role) to the request object
        const allowed = await trackSession(req, res);
        if (allowed !== true) return;
        next();
    } catch (error) {
        console.error('Authentication failed:', error);
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const optionalAuthenticate = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        const allowed = await trackSession(req, res);
        if (allowed !== true) return;
        return next();
    } catch (error) {
        req.user = null;
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.AUTH_COOKIE_SECURE
                ? ['1', 'true', 'yes'].includes(String(process.env.AUTH_COOKIE_SECURE).toLowerCase())
                : process.env.NODE_ENV === 'production',
            sameSite: (process.env.AUTH_COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase(),
            path: '/',
        });
        return next();
    }
};

// Optional: Specific check for Admin-only routes
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
};

module.exports = { authenticate, optionalAuthenticate, isAdmin };
