# Docker Image Size Breakdown

Current production image size: **171MB**

## Size Breakdown

### Base System & Node.js Runtime: ~129.5MB (76%)
- **Node.js binary**: 95.8MB — Node.js v20.19.6 executable
- **Node.js headers**: 5.9MB — C++ headers in `/usr/local/include/node`
- **npm & corepack**: 17.4MB — npm and corepack in `/usr/local/lib/node_modules`
- **Alpine Linux base**: ~10.4MB — system libraries, shell, core utilities

### Application Code & Dependencies: ~42.6MB (25%)

#### node_modules: 41.7MB
- **@img/sharp binaries**: 16.1MB
  - `sharp-libvips-linuxmusl-x64`: 15.8MB (image processing library binaries)
  - `sharp-linuxmusl-x64`: 292KB
- **better-sqlite3**: 11.6MB (SQLite database with native bindings)
- **lodash**: 4.9MB (utility library — transitive dependency)
- **async**: 1.0MB (async utilities — transitive dependency)
- **Other dependencies**: ~8.1MB (express, multer, archiver, sharp, cors, etc.)

#### Application Files: 876KB
- **Frontend build** (`/app/public`): 656KB — React app static files
- **Backend build** (`/app/dist`): 220KB — Compiled TypeScript

### Other: ~5.1MB (3%)
- System directories: `/opt`, `/bin`, `/lib`, `/etc`, etc.

## Largest Components
1. **Node.js runtime** (95.8MB, 56% of total)
2. **Sharp image processing binaries** (16.1MB, 9% of total)
3. **better-sqlite3** (11.6MB, 7% of total)
