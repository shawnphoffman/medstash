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

# Build frontend
RUN npm run build

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

# Build backend TypeScript
RUN npm run build

# Remove dev dependencies (keeps production deps with compiled native modules)
RUN npm prune --production && \
    npm cache clean --force && \
    apk del .build-deps && \
    rm -rf /var/cache/apk/*

# Stage 3: Runtime - optimized production image
FROM node:20-alpine

# Set production as default (can be overridden in docker-compose)
ENV NODE_ENV=production

WORKDIR /app

# Copy production node_modules from builder (already compiled, no build tools)
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy built backend (only dist, not src)
COPY --from=backend-builder /app/backend/dist ./dist

# Copy package.json for runtime reference (needed by some modules)
COPY --from=backend-builder /app/backend/package.json ./package.json

# Copy built frontend static files
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]

