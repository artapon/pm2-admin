# PM2 Admin

A modern, secure web interface for managing PM2 processes — designed and verified for **Windows Server** environments. A self-hosted alternative to PM2 Plus.

## Features

- **Process Dashboard** — View status, CPU, memory, uptime, and restarts for all PM2 apps at a glance. PM2 plugin processes are filtered into a separate Plugins page.
- **Process Control** — Reload, Restart (with optional rename + node args), Stop, and Delete processes.
- **Log Viewer** — Browse stdout/stderr logs per app with line numbers and color-coded log levels (error/warn/info/debug); download raw log files.
- **Environment Management** — View, edit, and back up `.env` files per app (root only).
- **Git Integration** — Clone new repositories and start them as PM2 processes; pull updates for running apps.
- **Server Monitor** — Live CPU/RAM/Disk charts, top processes list, shared folders.
- **Listening Ports** — See which ports are in use and mapped to PM2-managed apps.
- **Scheduled Tasks** — View Windows Task Scheduler / crontab jobs with search and filters.
- **Plugins** — Dedicated view for PM2 module processes (names prefixed with `pm2-`) with restart control.
- **Log Rotate** — Configure [pm2-logrotate](https://github.com/keymetrics/pm2-logrotate) settings (max size, retention, schedule, compression, timezone) via a UI form.
- **User Management** — Create and manage users with role-based access; root users can change their own password.
- **Dark UI** — Vue 3 + Vuetify 3 with a clean dark theme.

## Roles

| Capability | Root | User |
|---|---|---|
| View dashboard, logs, ports, monitor, scheduled tasks, plugins | ✓ | ✓ |
| Reload / Restart / Stop / Delete apps | ✓ | — |
| Edit `.env` files | ✓ | — |
| Git clone / Git pull | ✓ | — |
| Plugins — restart PM2 modules | ✓ | — |
| Log Rotate configuration | ✓ | — |
| User management | ✓ | — |
| Change own password | ✓ | — |

## Prerequisites

- **OS**: Windows Server 2016/2019/2022 or Windows 10/11
- **Node.js**: v16+
- **PM2**: `npm install -g pm2`
- **Git**: [Git for Windows](https://git-scm.com/download/win)

## Installation

### macOS / Linux

```bash
git clone https://github.com/artapon/pm2-admin.git
cd pm2-admin

# 1. Install all dependencies + create .env
./install.sh

# 2. Edit .env if needed (HOST, PORT, APP_SESSION_SECRET)
nano .env

# 3. Build the frontend
./build.sh

# 4a. Start in the foreground (dev / quick test)
./start.sh

# 4b. Or deploy as a persistent PM2 service (production)
./install-pm2-prd.sh
```

### Windows

```bat
install.bat
build.bat
start.bat                rem PM2 daemon if installed, else foreground node
:: or for a persistent Windows Service:
install-pm2-prd.bat      rem run as Administrator
```

### Manual (any platform)

```bash
npm install
npm run build    # builds src/frontend/dist via Vite
npm start        # node src/app.js
```

Visit `http://localhost:4343`. On first run you will be redirected to the **Setup** page to create the initial root account.

## Scripts

Each operation has a matching Unix and Windows script:

| Purpose | macOS / Linux | Windows |
|---|---|---|
| Install all dependencies + create `.env` | `install.sh` | `install.bat` |
| Build the Vue frontend | `build.sh` | `build.bat` |
| Start (PM2 if available, else foreground) | `start.sh` | `start.bat` |
| Deploy as a persistent service (production) | `install-pm2-prd.sh` | `install-pm2-prd.bat` |

**Unix scripts** use `scripts/_common.sh` for shared helpers (colour output, env parsing, prerequisite checks).

**Windows production** (`install-pm2-prd.bat`) uses [NSSM](https://nssm.cc) to wrap the PM2 daemon as a Windows Service so all managed processes survive reboots. Place `nssm-2.24.zip` next to the script before running, or pre-install `nssm.exe` to `C:\nssm\nssm.exe`.

## Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Default | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `4343` | HTTP port |
| `APP_SESSION_SECRET` | *(auto-generated)* | Session signing secret — set this for persistence across restarts |

## Log Rotate

If [pm2-logrotate](https://github.com/keymetrics/pm2-logrotate) is installed (`pm2 install pm2-logrotate`), the **ADMIN > Log Rotate** page lets you configure it from the UI:

| Setting | Default | Description |
|---|---|---|
| Max Size | `1G` | File size that triggers rotation |
| Retain | `3` | Number of rotated files to keep |
| Rotate Interval | `0 0 1 * *` | Cron schedule (default: 1st of each month) |
| Worker Interval | `30` | Seconds between size checks |
| Date Format | `YYYY-MM-DD_HH-mm-ss` | Rotated file name pattern |
| Timezone | *(system)* | IANA timezone for timestamps |
| Compress | off | Gzip rotated files |
| Rotate Module Logs | on | Include PM2 module logs |

## Tech Stack

**Backend**
- Node.js + Express 4
- `better-sqlite3` — user/session storage
- `express-session` — session management
- `bcryptjs` — password hashing
- `systeminformation` — OS/hardware metrics
- `pm2` — programmatic process control
- `express-rate-limit` — rate limiting on auth and git endpoints

**Frontend**
- Vue 3 (Composition API) + Vite
- Vuetify 3 + Material Design Icons
- Pinia — state management
- Vue Router 4
- Chart.js + vue-chartjs — live monitoring charts
- Axios — HTTP client

## Security

- Passwords hashed with bcrypt (10 rounds)
- Session cookies: `httpOnly`, `sameSite: strict`, 7-day rolling expiry
- Security headers on every response: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
- Rate limiting: login (100 req/2 min), git clone/pull (10 req/5 min)
- All git and PM2 shell commands use argument arrays — no shell string interpolation
- Path traversal prevention on git clone target directory
- User ID 1 (initial root) cannot be deleted

## License

MIT
