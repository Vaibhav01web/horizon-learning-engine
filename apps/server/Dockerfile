# The API runs as a container so Chrome is guaranteed present: the Doubt-Buster
# PDF is rendered by Puppeteer, and a host's stock Node image rarely carries the
# shared libraries Chrome needs.
#
# Build context is the repository root, not this directory — npm workspaces
# means the lockfile and the shared package live above.
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    # Use the distribution's Chromium instead of letting Puppeteer download its
    # own; the apt build already has every dependency wired up.
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        fonts-liberation \
        fonts-noto-color-emoji \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so a source-only change reuses the install layer.
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# The client is never built here, so skip its workspace entirely.
RUN npm ci --workspace @zpl/server --workspace @zpl/shared-types --include-workspace-root

COPY packages/shared-types ./packages/shared-types
COPY apps/server ./apps/server

RUN npm run build --workspace @zpl/server

EXPOSE 4000
# Hosts assign a port at runtime; Next reads PORT when it is set.
CMD ["npm", "run", "start", "--workspace", "@zpl/server"]
