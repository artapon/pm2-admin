const checkAuthentication = async (ctx, next) => {
    if(ctx.session.isAuthenticated){
        return ctx.redirect('/apps')
    }
    await next()
}

const isAuthenticated = async (ctx, next) => {
    if(!ctx.session.isAuthenticated){
        // Check if this is an API request
        if (ctx.path.startsWith('/api/')) {
            ctx.status = 401;
            ctx.body = {
                success: false,
                error: 'Unauthorized'
            };
            return;
        }
        return ctx.redirect('/login')
    }
    await next()
}

const config = require('../config')

const isRoot = async (ctx, next) => {
    let role = ctx.session.role;
    
    // Robust fallback for existing sessions missing role property
    if (ctx.session.isAuthenticated && !role && ctx.session.username === config.APP_USERNAME) {
        role = 'root';
        ctx.session.role = 'root'; // Persist it for next check
    }

    console.log(`Checking root role for user: ${ctx.session.username}, role: ${role}`);
    
    if(!ctx.session.isAuthenticated || role !== 'root'){
        ctx.status = 403;
        ctx.body = {
            success: false,
            error: `Forbidden: Requires Root role (Current: ${role || 'none'})`
        };
        return;
    }
    await next();
}

module.exports = {
    isAuthenticated,
    checkAuthentication,
    isRoot
};