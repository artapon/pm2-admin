###############################################################################
# Stage 1 — builder
#   Installs build tools required by better-sqlite3 (native Node addon),
#   compiles backend production dependencies, and builds the Vue 3 frontend.
###############################################################################
FROM node:24-slim AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend — production deps only (triggers better-sqlite3 native compile)
COPY package*.json ./
RUN npm ci --omit=dev

# Frontend — install dev deps, then build
COPY src/frontend/package*.json src/frontend/
RUN npm ci --prefix src/frontend
COPY src/frontend/ src/frontend/
# Cap Node heap: Vite + Vuetify can OOM on constrained build environments
RUN NODE_OPTIONS="--max-old-space-size=384" npm run --prefix src/frontend build


###############################################################################
# Stage 2 — production
#   Lean runtime image: no build tools, no frontend source, no dev deps.
###############################################################################
FROM node:24-slim

WORKDIR /app

# Compiled native modules + built frontend assets from builder
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/src/frontend/dist   ./src/frontend/dist

# Backend source
COPY src/ ./src/

# Drop frontend source tree — only the built dist is used at runtime
RUN rm -rf ./src/frontend/node_modules \
           ./src/frontend/src \
           ./src/frontend/public \
           ./src/frontend/vite.config.js \
           ./src/frontend/index.html

COPY package.json    ./
COPY .env.example    ./.env.example

# ── Volumes ──────────────────────────────────────────────────────────────────
# /app/data  — SQLite database (users + sessions); persists across restarts.
# /app/.env  — runtime config & auto-generated session secret; bind-mount a
#              writable file so the secret survives container restarts:
#                -v $(pwd)/.env:/app/.env
# /root/.pm2 — PM2 daemon socket; bind-mount from host to manage host processes:
#                -v ~/.pm2:/root/.pm2
VOLUME ["/app/data"]

# ── Runtime defaults ─────────────────────────────────────────────────────────
# HOST must be 0.0.0.0 inside Docker (default in config is 127.0.0.1).
# All values can be overridden with -e flags or an --env-file.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4343

EXPOSE 4343

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "\
      require('http').get(\
        'http://localhost:' + (process.env.PORT||4343) + '/api/auth/session',\
        r => process.exit(r.statusCode < 500 ? 0 : 1)\
      ).on('error', () => process.exit(1))"

CMD ["node", "src/app.js"]
