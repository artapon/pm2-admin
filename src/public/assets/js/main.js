async function pm2AppAction(appName, action){
    if(action == 'stop') {
        if (confirm("Do you want to stop this application ?") == true) {
            await fetch(`/api/apps/${appName}/${action}`, { method: 'POST'})
        }
    }
    else {
        await fetch(`/api/apps/${appName}/${action}`, { method: 'POST'})
    }
    location.reload();
}