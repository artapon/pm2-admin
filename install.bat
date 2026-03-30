@echo off
:: Check if .env already exists
if not exist ".env" (
    echo .env does not exist. Renaming .env.example to .env...
    :: Check if .env.example exists
    if exist ".env.example" (
        rename ".env.example" ".env"
        echo Renamed .env.example to .env successfully.
    ) else (
        echo .env.example does not exist. Cannot rename.
    )
) else (
    echo .env already exists. No action needed.
)
npm install pm2 -g && npm install pm2-windows-startup -g && npm install && pm2-startup install && pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 300M && pm2 set pm2-logrotate:retain 90 && pm2 set pm2-logrotate:compress true && npm run setup-admin-user