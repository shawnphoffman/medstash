# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.mts ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/components.json ./

# Install frontend dependencies (use npm ci for faster, more reliable installs)
RUN npm ci && npm cache clean --force

# Copy frontend source code
COPY frontend/src ./src
COPY frontend/index.html ./

# Copy public directory (contains logo.png and other static assets)
COPY frontend/public ./public

# Build frontend (production build without source maps)
RUN npm run build && \
    find dist -name "*.map" -delete 2>/dev/null || true

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Install build dependencies needed for better-sqlite3 compilation
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++

# Copy backend package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install ALL dependencies (including dev dependencies for TypeScript build)
# Use npm ci if package-lock.json exists, otherwise use npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi && \
    npm cache clean --force

# Copy backend source code
COPY backend/src ./src

# Copy migrations directory (needed for runtime)
COPY backend/migrations ./migrations

# Build backend TypeScript (production build without source maps/declarations)
RUN npx tsc --project tsconfig.json --sourceMap false --declaration false --declarationMap false

# Remove dev dependencies (keeps production deps with compiled native modules)
RUN npm prune --production && \
    npm cache clean --force && \
    apk del .build-deps && \
    rm -rf /var/cache/apk/*

# Clean up node_modules: remove unnecessary files (saves ~15-25MB)
RUN find node_modules -type f \( \
        -name "*.md" -o \
        -name "*.txt" -o \
        -name "LICENSE*" -o \
        -name "CHANGELOG*" -o \
        -name "*.map" -o \
        -name "*.ts" -o \
        -name "*.tsx" -o \
        -name "*.js.map" -o \
        -name "*.d.ts.map" -o \
        -path "*/test/*" -o \
        -path "*/tests/*" -o \
        -path "*/__tests__/*" -o \
        -path "*/docs/*" -o \
        -path "*/doc/*" -o \
        -path "*/.github/*" -o \
        -path "*/examples/*" -o \
        -path "*/example/*" -o \
        -path "*/benchmark/*" -o \
        -path "*/benchmarks/*" -o \
        -name "*.spec.js" -o \
        -name "*.test.js" \
    \) -delete && \
    # Remove platform-specific binaries we don't need (Alpine uses musl, not glibc)
    # This saves ~15.5MB by removing linux-x64 binaries
    rm -rf node_modules/@img/sharp-libvips-linux-x64 2>/dev/null || true && \
    rm -rf node_modules/@img/sharp-linux-x64 2>/dev/null || true && \
    # Remove empty directories and .git directories
    find node_modules -type d \( -name ".git" -o -empty \) -delete && \
    # Remove large unnecessary files from specific packages
    find node_modules -type f \( \
        -name "*.png" -o \
        -name "*.jpg" -o \
        -name "*.gif" -o \
        -name "*.svg" \
    \) ! -path "*/sharp/*" ! -path "*/@img/*" -delete 2>/dev/null || true && \
    find node_modules -type d -empty -delete

# Stage 3: Runtime - optimized production image
FROM node:20-alpine

# Set production as default (can be overridden in docker-compose)
ENV NODE_ENV=production

# Clean up unnecessary files (npm removal can cause issues, so we keep it but clean cache)
RUN rm -rf /root/.npm && \
    rm -rf /tmp/* && \
    rm -rf /var/cache/apk/* && \
    find /usr/lib/node_modules/npm -type f \( -name "*.md" -o -name "*.txt" -o -name "LICENSE*" \) -delete 2>/dev/null || true

WORKDIR /app

# Copy production node_modules from builder (already compiled, no build tools)
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy built backend (only dist, not src)
COPY --from=backend-builder /app/backend/dist ./dist

# Copy package.json for runtime reference (needed by some modules)
COPY --from=backend-builder /app/backend/package.json ./package.json

# Copy migrations directory (needed at runtime)
COPY --from=backend-builder /app/backend/migrations ./migrations

# Copy built frontend static files
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]

