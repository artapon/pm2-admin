const config = require('../config');

const isAuthenticated = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        return res.redirect('/login');
    }
    next();
};

const isRoot = (req, res, next) => {
    let role = req.session.role;

    if (req.session.isAuthenticated && !role && req.session.username === config.APP_USERNAME) {
        role = 'root';
        req.session.role = 'root';
    }

    if (!req.session.isAuthenticated || role !== 'root') {
        return res.status(403).json({ success: false, error: 'Forbidden: root role required' });
    }
    next();
};

module.exports = { isAuthenticated, isRoot };
