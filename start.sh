#!/usr/bin/env bash
# start.sh — Start pm2-admin.
#            If PM2 is available: starts as a PM2 daemon process.
#            Otherwise: starts in the foreground with Node.js.
#            Use install-pm2-prd.sh for persistent auto-start on reboot.
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/scripts/_common.sh"

header "pm2-admin — Start"

check_node_version 16

cd "${PROJECT_ROOT}"

[[ -f ".env" ]] || die ".env not found. Run ./install.sh first."

DIST="${PROJECT_ROOT}/src/frontend/dist"
if [[ ! -d "${DIST}" ]]; then
    warn "Frontend build not found at ${DIST}."
    read -rp "Build now? [y/N] " answer
    if [[ "${answer,,}" == "y" ]]; then
        "${PROJECT_ROOT}/build.sh"
    else
        die "Cannot start without a frontend build."
    fi
fi

APP_PORT=$(read_env PORT 4343)
HOST=$(read_env HOST 127.0.0.1)

# ── PM2 branch ────────────────────────────────────────────────────────────────
if command -v pm2 &>/dev/null; then
    APP_NAME="pm2-admin:${APP_PORT}"
    info "PM2 detected — starting as daemon."
    echo ""

    if pm2 describe "${APP_NAME}" &>/dev/null; then
        warn "Existing PM2 process '${APP_NAME}' found — deleting..."
        pm2 delete "${APP_NAME}"
    fi

    pm2 start "${PROJECT_ROOT}/src/app.js" \
        --name "${APP_NAME}" \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        --restart-delay 3000 \
        --max-restarts 10

    pm2 save
    echo ""
    success "pm2-admin is running!"
    echo -e "  URL    : ${BOLD}http://${HOST}:${APP_PORT}${RESET}"
    echo -e "  Logs   : ${BOLD}pm2 logs ${APP_NAME}${RESET}"
    echo -e "  Status : ${BOLD}pm2 status${RESET}"
    echo -e "  Stop   : ${BOLD}pm2 stop ${APP_NAME}${RESET}"
    echo ""
    open_browser "http://localhost:${APP_PORT}" || true
    exit 0
fi

# ── Node fallback ─────────────────────────────────────────────────────────────
warn "PM2 not found — starting in foreground with Node.js."
info "Press Ctrl-C to stop."
echo ""
node "${PROJECT_ROOT}/src/app.js"
