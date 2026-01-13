# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
# Use npm ci if package-lock.json exists, otherwise use npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install build dependencies needed for better-sqlite3 compilation
# These will be removed after npm install
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++

# Copy package files and install production dependencies only
COPY package*.json ./
# Use npm ci if package-lock.json exists, otherwise use npm install
RUN if [ -f package-lock.json ]; then npm ci --production; else npm install --production; fi && npm cache clean --force

# Remove build dependencies after npm install (saves ~100MB)
RUN apk del .build-deps && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy migrations directory (needed at runtime)
COPY migrations ./migrations

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Start server
CMD ["npm", "start"]

