# PM2 Admin 🚀
A modern, beautiful, and secure web interface for managing your PM2 processes — **specifically designed and verified for Windows Server environments.** An excellent open-source alternative to PM2 Plus for Enterprise Windows deployments.

## ✨ Features

- 📊 **Real-time Monitoring**: Track CPU, Memory, Uptime, and Status of all your PM2 processes at once.
- 🛠️ **Process Control**: Start, Stop, Restart, and Reload services directly from the browser.
- 📄 **Deep Log Viewing**: Seamlessly view and flush standard output and error logs.
- 🔐 **Role-Based Access Control (RBAC)**:
  - **Root**: Full administrative access, user management, environment editing, and system controls.
  - **User**: View-only access to dashboards, logs, ports, and scheduled tasks.
- 📂 **Environment Management**: Edit `.env` files directly from the UI with backup support (Root only).
- 🧬 **Git Integration**: Clone new repositories and pull updates for existing services with ease.
- 🕸️ **Network & OS Insight**: Monitor listening ports, server metrics (CPU/RAM/Disk), and top processes.
- ⏱️ **Scheduled Tasks**: View system scheduled tasks in a clean interface.
- 🎨 **Premium UI**: Built with Vue 3 & Vuetify, featuring a sleek dark-mode design with subtle glassmorphism.
- 🚀 **Web-Based Setup**: Modern, wizard-driven initial installation — no CLI setup required.

## 🛠️ Prerequisites

- **OS**: Windows Server (2016 / 2019 / 2022) or Windows 10/11
- **Node.js**: v16+
- **PM2**: `npm install -g pm2`
- **Git**: [Git for Windows](https://git-scm.com/download/win) installed.
- **SQLite3**: Automatically handled via `better-sqlite3`.

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://your-repo-url/pm2-admin.git
cd pm2-admin
npm install
```

### 2. Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
*Note: You don't need to set administrative credentials in `.env` anymore; you can do it via the web UI on first run.*

### 3. Start the Application
```bash
npm start
```
The application will run on the port defined in `.env` (default is 4000).

### 4. Initial Setup
1. Visit `http://localhost:4000` in your browser.
2. If this is a fresh installation, you will be automatically redirected to the **Initial Setup** page.
3. Create your first **Root** account.
4. Log in and start managing your services!

## 🐳 Deployment with PM2
To run this monitor itself as a PM2 service:
```bash
pm2 start .\src\app.js --name "pm2-monitor" --log-date-format "YYYY-MM-DD HH:mm:ss"
```

## 🔒 Security
- **SQLite-backed Auth**: All user credentials are securely hashed and stored in `/data/database.sqlite`.
- **Session Management**: Secure, signed session cookies are used for authentication.
- **Role Enforcement**: Every state-changing action is protected by backend middleware verifying role permissions.

## 🤝 Contributing
Feel free to open issues or submit pull requests to improve the platform!

## 📄 License
MIT © 2026