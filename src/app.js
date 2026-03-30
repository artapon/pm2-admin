#!/usr/bin/env node

const config = require('./config')
const { setEnvDataSync } = require('./utils/env.util')
const { generateRandomString } = require('./utils/random.util')
const path = require('path');
const serve = require('koa-static');
const koaBody = require('koa-body');
const session = require('koa-session');
const Koa = require('koa');
const { initDb } = require('./services/db.service');

// Init Database
initDb();

// Initial Application

if (!config.APP_SESSION_SECRET) {
    const randomString = generateRandomString()
    setEnvDataSync(config.APP_DIR, { APP_SESSION_SECRET: randomString })
    config.APP_SESSION_SECRET = randomString
}

// Create App Instance
const app = new Koa();

// App Settings
app.proxy = true;
app.keys = [config.APP_SESSION_SECRET];

// Middlewares
const CONFIG = {
    key: 'koa:sess',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    autoCommit: true,
    overwrite: true,
    httpOnly: true,
    signed: true,
    rolling: true,
    renew: true,
};
app.use(session(CONFIG, app));

app.use(koaBody());

app.use(async (ctx, next) => {
    ctx.state.flash = ctx.session.flash || {};
    delete ctx.session.flash;
    await next();
});

// Serve frontend static files
app.use(serve(path.join(__dirname, 'frontend/dist')));

const router = require("./routes");
app.use(router.routes());

app.listen(config.PORT, config.HOST, () => {
    console.log(`Application started at http://${config.HOST}:${config.PORT}`)
})