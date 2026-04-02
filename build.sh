#!/usr/bin/env bash
# build.sh — Build the Vue 3 frontend into src/frontend/dist.
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/scripts/_common.sh"

header "pm2-admin — Build Frontend"

check_node_version 16

FRONTEND_DIR="${PROJECT_ROOT}/src/frontend"

if [[ ! -d "${FRONTEND_DIR}/node_modules" ]]; then
    warn "Frontend node_modules not found. Running npm install first..."
    cd "${FRONTEND_DIR}"
    npm install
fi

info "Building frontend..."
cd "${FRONTEND_DIR}"
npm run build

DIST="${FRONTEND_DIR}/dist"
if [[ ! -d "${DIST}" ]]; then
    die "Build finished but dist/ directory not found. Check the Vite output above."
fi

success "Frontend built → ${DIST}"
echo ""
