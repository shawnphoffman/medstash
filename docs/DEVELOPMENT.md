# Development Guide

This document contains information for developers working on MedStash, including local setup, architecture details, and testing.

## Local Development Setup

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (for containerized development)

### Quick Start

#### Development with Docker (Recommended)

Start the development environment with hot reload:

```bash
# Start with file watching (recommended)
docker compose -f docker-compose.dev.yml watch

# Or start without watch (file changes still sync via volume mounts)
docker compose -f docker-compose.dev.yml up
```

This will start:
- **Backend** on `http://localhost:3011` with hot reload
- **Frontend** on `http://localhost:3010` with Vite dev server

#### Local Build (Testing Production Build)

For testing with a locally built image:

```bash
docker compose -f docker-compose.local.yml up
```

#### Development Without Docker

1. **Install dependencies**:
   ```bash
   # From project root
   npm install
   ```

2. **Start backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Start frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Architecture Overview

MedStash is a full-stack application with React frontend and Node.js/Express backend, storing receipts as files on the filesystem with metadata in SQLite.

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   React     │ ──────> │   Express    │ ──────> │   SQLite    │
│  Frontend   │         │    API      │         │  (metadata) │
│  (Vite)     │         │             │         └─────────────┘
└─────────────┘         │             │
                        │             │         ┌─────────────┐
                        │             │ ──────> │ Filesystem  │
                        │             │         │  (receipts) │
                        └─────────────┘         └─────────────┘
```

**Tech Stack**:
- Vite for build tooling
- React Router for navigation
- react-hook-form for forms
- Tailwind CSS (via shadcn)
- axios for API calls
- shadcn/ui components

## Backend

**Tech Stack**:
- Express.js for API server
- better-sqlite3 for SQLite database
- multer for file uploads
- sharp for image optimization
- archiver for zip export

### Quick Test Commands

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Run all tests from root
npm test
```