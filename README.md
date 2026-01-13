# MedStash - HSA Receipt Storage
> [!IMPORTANT]
> This project started as a vibe-coding experiment but is slowly becoming more stable. Don't use without backups or with critical data. Do not expose publicly.

A dead simple, local-only receipt storage system for long-term HSA recordkeeping. Files stored on your filesystem, metadata in SQLite. No vendor lock-in.

## Features

- Files stored directly on your filesystem so no vendor lock-in
- Multiple files per receipt (PDF and images)
- SQLite database for metadata
- Custom flags for categorization (Optional)
- Automatic image optimization (Optional)
- Bulk export functionality
- Docker deployment

## Screenshots

#### Receipts Page
<table>
<tr>
<td><img src="docs/screenshots/receipts-page_light.png" alt="Receipts Page (Light Mode)" width="100%"></td>
<td><img src="docs/screenshots/receipts-page.png" alt="Receipts Page (Dark Mode)" width="100%"></td>
</tr>
</table>

#### Upload Page
<table>
<tr>
<td><img src="docs/screenshots/upload-page_light.png" alt="Upload Page (Light Mode)" width="100%"></td>
<td><img src="docs/screenshots/upload-page.png" alt="Upload Page (Dark Mode)" width="100%"></td>
</tr>
</table>

#### Settings Page
<table>
<tr>
<td><img src="docs/screenshots/settings-page_light.png" alt="Settings Page (Light Mode)" width="100%"></td>
<td><img src="docs/screenshots/settings-page.png" alt="Settings Page (Dark Mode)" width="100%"></td>
</tr>
</table>

#### Receipt Detail Page
<table>
<tr>
<td><img src="docs/screenshots/receipt-detail-page_light.png" alt="Receipt Detail Page (Light Mode)" width="100%"></td>
<td><img src="docs/screenshots/receipt-detail-page.png" alt="Receipt Detail Page (Dark Mode)" width="100%"></td>
</tr>
</table>

## Deployment

1. Copy contents of `docker-compose.yml`
2. Deploy

## Configuration

### Environment Variables

See `env.example` for all available environment variables. Key variables:

- `PORT` - Server port
- `ALLOWED_ORIGINS` - CORS allowed origins, comma-separated (optional, if not set all origins are allowed)
- `UPLOAD_DIR` - Temporary upload directory (default: `/tmp/medstash-uploads`)

**Note:** Database and receipts are stored in `/data` by default. In Docker, mount your volume to `/data`.

### Docker Compose Variables

- `MEDSTASH_IMAGE_TAG` - Docker image tag (default: `latest`)
- `MEDSTASH_DATA_DIR` - Data storage path (default: `./data`)

## Data Storage

All data stored in `MEDSTASH_DATA_DIR` (default: `./data`):
- `db.sqlite` - SQLite database
- `receipts/` - Receipt files

Backup the `data/` directory to backup everything.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for development setup and documentation.

## License

MIT
