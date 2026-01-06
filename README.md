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

```bash
docker compose up
```

## Project Structure

- `frontend/` - React + Vite frontend with shadcn/ui
- `backend/` - Node.js/Express API with SQLite
- `docker-compose.yml` - Production setup
- `docker-compose.dev.yml` - Development with hot reload

## License

MIT

