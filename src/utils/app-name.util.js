// One definition of what a PM2 process identifier may look like. This lived as three
// separate copies (routes, controller, PM2 provider); the routes copy drifted and lost the
// comma, which broke log downloads for multi-port apps like `lis-interface-service:8198,8199`.
// Every layer that accepts an app name from a request validates through here.
const APP_NAME_RE = /^[A-Za-z0-9_.,:\-]{1,128}$/;

const isValidAppName = (n) => typeof n === 'string' && APP_NAME_RE.test(n);

module.exports = {
    APP_NAME_RE,
    isValidAppName
};
