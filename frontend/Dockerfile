FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.mts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY components.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY index.html ./

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

