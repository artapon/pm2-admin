#!/usr/bin/env bash
# build.sh — Build the Vue 3 frontend into src/frontend/dist.
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/_common.sh"

header "pm2-admin — Build Frontend"

check_node_version 16

# Ensure swap exists so Vite doesn't get OOM-killed on low-memory servers.
ensure_swap() {
    if command -v swapon &>/dev/null && [[ $(swapon --show 2>/dev/null | wc -l) -le 1 ]]; then
        warn "No swap detected — creating 2 GB swap file (needed for Vite build on low-memory servers)..."
        local swapfile="/swapfile"
        if [[ ! -f "$swapfile" ]]; then
            fallocate -l 2G "$swapfile" 2>/dev/null \
                || dd if=/dev/zero of="$swapfile" bs=1M count=2048 status=none
            chmod 600 "$swapfile"
            mkswap "$swapfile" -q
        fi
        swapon "$swapfile" 2>/dev/null || true
        success "Swap enabled ($(swapon --show --noheadings --bytes | awk '{sum+=$3} END {printf "%.0f MB", sum/1024/1024}'))"
    fi
}

ensure_swap

FRONTEND_DIR="${PROJECT_ROOT}/src/frontend"

if [[ ! -d "${FRONTEND_DIR}/node_modules" ]]; then
    warn "Frontend node_modules not found. Running npm install first..."
    cd "${FRONTEND_DIR}"
    npm install
fi

info "Building frontend..."
cd "${FRONTEND_DIR}"
# Cap Node heap to leave room for OS + rollup workers; prevents OOM kill on 512 MB servers.
NODE_OPTIONS="--max-old-space-size=384" npm run build

DIST="${FRONTEND_DIR}/dist"
if [[ ! -d "${DIST}" ]]; then
    die "Build finished but dist/ directory not found. Check the Vite output above."
fi

success "Frontend built → ${DIST}"
echo ""
