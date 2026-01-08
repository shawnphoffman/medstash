# MedStash

A self-hostable medical receipt storage system designed for long-term HSA recordkeeping. Store medical receipts with full compliance to IRS HSA recordkeeping guidelines.

## Features

- 📄 Support for PDF and image files
- 📁 Multiple files per receipt
- 🏷️ Custom flags for categorization
- 💾 Filesystem-based storage (no vendor lock-in)
- 📊 SQLite metadata storage
- 🖼️ Automatic image optimization
- 📦 Bulk export functionality
- 🐳 Docker & Docker Compose support

## HSA Compliance

MedStash stores all required HSA recordkeeping information:
- Date of service
- Service provider name and address
- Detailed description
- Amount paid

## Quick Start

### Development

```bash
# Start with file watching (recommended)
docker compose -f docker-compose.dev.yml watch

# Or start without watch (file changes still sync via volume mounts)
docker compose -f docker-compose.dev.yml up
```

### Production

#### Local Build

For local development and testing with a locally built image:

```bash
docker compose -f docker-compose.local.yml up
```

#### Deploy from GHCR (Recommended for Portainer)

The default `docker-compose.yml` pulls images from GitHub Container Registry (GHCR). This is the recommended approach for deploying to Portainer or other remote servers.

```bash
# Using latest image
docker compose up

# Using a specific version tag
MEDSTASH_IMAGE_TAG=v1.0.0 docker compose up

# Using a commit SHA tag
MEDSTASH_IMAGE_TAG=main-abc1234 docker compose up
```

## Deployment

### Portainer Deployment

1. **In Portainer**, create a new Stack
2. **Copy the contents** of `docker-compose.yml` into the stack editor
3. **Set environment variables** (optional):
   - `MEDSTASH_IMAGE_TAG`: Pin to a specific version (e.g., `v1.0.0`, `main-abc1234`) or leave unset to use `latest`
   - `MEDSTASH_DATA_DIR`: Path for persistent storage (defaults to `./data`)
4. **Deploy the stack**

### Image Availability

Docker images are automatically built and pushed to GitHub Container Registry on:
- Every push to `main`/`master` branch (tagged as `:latest` and `:main-{sha}`)
- Every git tag starting with `v` (e.g., `v1.0.0` creates `:v1.0.0`)

**Image location**: `ghcr.io/shawnphoffman/medstash`

### Authentication

If deploying from a private repository, you'll need to authenticate with GHCR:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

For Portainer, add the GHCR registry in Settings → Registries.

## Project Structure

- `frontend/` - React + Vite frontend with shadcn/ui
- `backend/` - Node.js/Express API with SQLite
- `docker-compose.yml` - Production setup (pulls from GHCR)
- `docker-compose.local.yml` - Local build setup
- `docker-compose.dev.yml` - Development with hot reload

## License

MIT

