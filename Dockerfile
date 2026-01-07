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

# Install frontend dependencies
RUN npm install

# Copy frontend source code
COPY frontend/src ./src
COPY frontend/index.html ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install backend dependencies
RUN npm install

# Copy backend source code
COPY backend/src ./src

# Build backend TypeScript
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install production dependencies only
COPY backend/package*.json ./
RUN npm install --production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/src ./src

# Copy built frontend static files
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]

