FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.mts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY components.json ./

# Install dependencies (use npm ci for faster, more reliable installs)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src ./src
COPY index.html ./

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx files we don't need
RUN rm -rf /usr/share/nginx/html/index.html.bak /usr/share/nginx/html/50x.html || true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

