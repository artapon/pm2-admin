#!/usr/bin/env bash
# install-pm2-prd.sh — Register pm2-admin as a persistent PM2 service.
#                      Run once to deploy; PM2 will restart it automatically
#                      after reboots (once you apply the startup hook below).
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/scripts/_common.sh"

header "pm2-admin — Production Deploy via PM2"

check_node_version 16
require_cmd pm2 "Install with: npm install -g pm2"

cd "${PROJECT_ROOT}"

# ── Guards ────────────────────────────────────────────────────────────────────
[[ -f ".env" ]] || die ".env not found. Run ./install.sh first."

DIST="${PROJECT_ROOT}/src/frontend/dist"
if [[ ! -d "${DIST}" ]]; then
    warn "Frontend build not found at ${DIST}."
    read -rp "Build now? [y/N] " answer
    if [[ "${answer,,}" == "y" ]]; then
        "${PROJECT_ROOT}/build.sh"
    else
        die "Cannot deploy without a frontend build. Run ./build.sh first."
    fi
fi

# ── Config ────────────────────────────────────────────────────────────────────
PORT=$(read_env PORT 4343)
HOST=$(read_env HOST 127.0.0.1)
APP_NAME="pm2-admin"
APP_ENTRY="${PROJECT_ROOT}/src/app.js"

# ── Remove existing instance (if any) ─────────────────────────────────────────
if pm2 describe "${APP_NAME}" &>/dev/null; then
    warn "Existing PM2 process '${APP_NAME}' found — deleting it..."
    pm2 delete "${APP_NAME}"
fi

# ── Start ─────────────────────────────────────────────────────────────────────
info "Starting '${APP_NAME}' with PM2..."
pm2 start "${APP_ENTRY}" \
    --name "${APP_NAME}" \
    --log-date-format "YYYY-MM-DD HH:mm:ss" \
    --restart-delay 3000 \
    --max-restarts 10

pm2 save
success "PM2 process saved."

# ── Startup hook ──────────────────────────────────────────────────────────────
echo ""
header "Auto-start on system boot"
echo -e "${YELLOW}Run the following command to enable PM2 auto-start after reboot:${RESET}"
echo ""
STARTUP_CMD=$(pm2 startup 2>&1 | grep -E "^\s*sudo" | head -1 | sed 's/^[[:space:]]*//')
if [[ -n "${STARTUP_CMD}" ]]; then
    echo -e "  ${BOLD}${STARTUP_CMD}${RESET}"
else
    echo -e "  Run ${BOLD}pm2 startup${RESET} and follow its instructions."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
success "pm2-admin is running!"
echo -e "  URL    : ${BOLD}http://${HOST}:${PORT}${RESET}"
echo -e "  Logs   : ${BOLD}pm2 logs ${APP_NAME}${RESET}"
echo -e "  Status : ${BOLD}pm2 status${RESET}"
echo -e "  Stop   : ${BOLD}pm2 stop ${APP_NAME}${RESET}"
echo -e "  Remove : ${BOLD}pm2 delete ${APP_NAME}${RESET}"
echo ""

# Attempt to open browser (non-fatal)
open_browser "http://localhost:${PORT}" || true
