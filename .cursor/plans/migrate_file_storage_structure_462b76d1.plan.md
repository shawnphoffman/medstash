---
name: Migrate File Storage Structure
overview: Migrate file storage from receipt ID-based directories (`/data/receipts/{receiptId}/`) to a hierarchical date-based structure (`/data/receipts/{user}/{year}/{month}/{day}/`). This requires updating all file service functions, their callers, and providing a migration path for existing files.
todos:
  - id: "1"
    content: "Add helper functions: parseDateComponents() and getReceiptDirByDate() in fileService.ts"
    status: completed
  - id: "2"
    content: Update getReceiptDir() to use user/date structure instead of receiptId
    status: completed
  - id: "3"
    content: Update getReceiptFilePath() to accept user/date parameters
    status: completed
  - id: "4"
    content: Update saveReceiptFile() to use new directory structure
    status: completed
  - id: "5"
    content: Update replaceReceiptFile() to fetch receipt and use new structure
    status: completed
  - id: "6"
    content: Update deleteReceiptFile() and deleteReceiptFiles() to use new structure
    status: completed
  - id: "7"
    content: Update fileExists() to use new structure
    status: completed
  - id: "8"
    content: Rewrite restoreFileAssociations() to scan new directory structure
    status: completed
  - id: "9"
    content: Update routes/receipts.ts to pass user/date to file operations
    status: completed
  - id: "10"
    content: Update routes/export.ts to use new file path resolution
    status: completed
  - id: "11"
    content: Update watchService.ts to use new directory structure
    status: completed
  - id: "12"
    content: Create migrateFilesToDateStructure() function
    status: completed
  - id: "13"
    content: Update all fileService tests to use new structure
    status: completed
  - id: "14"
    content: Update route tests to use new structure
    status: completed
  - id: "15"
    content: Update watchService tests to use new structure
    status: completed
---

# Migrate File Storage to User/Date-Based Directory Structure

## Current Structure

Files are currently stored as: `/data/receipts/{receiptId}/filename.ext`

## Target Structure

Files will be stored as: `/data/receipts/{sanitizedUser}/{year}/{month}/{day}/filename.ext`

## Implementation Plan

### 1. Update Core File Service Functions

**File: `backend/src/services/fileService.ts`**

- **Update `getReceiptDir()`**: Change signature from `getReceiptDir(receiptId: number)` to `getReceiptDir(user: string, date: string)` or create a new function `getReceiptDirByDate(user: string, date: string)` that:
- Sanitizes user name using `sanitizeFilename()` from `utils/filename.ts`
- Parses date (ISO format: YYYY-MM-DD) to extract year, month, day
- Returns path: `{receiptsDir}/{sanitizedUser}/{year}/{month}/{day}/`
- Handles edge cases (invalid dates default to current date, empty user defaults to "unknown")

- **Update `getReceiptFilePath()`**: Change to accept user and date instead of receiptId, or create overload that accepts receiptId and looks up user/date from database

- **Update `ensureReceiptDir()`**: Rename to `ensureReceiptDirByDate()` and update to use new structure

- **Update all file operations** to use new directory structure:
- `saveReceiptFile()` - already has user and date parameters ✓
- `replaceReceiptFile()` - needs to fetch receipt to get user/date
- `deleteReceiptFile()` - needs to fetch receipt to get user/date
- `deleteReceiptFiles()` - needs to fetch receipt to get user/date
- `fileExists()` - needs to fetch receipt to get user/date
- `renameReceiptFiles()` - already has user and date parameters ✓
- `restoreFileAssociations()` - needs complete rewrite to scan new structure

### 2. Add Helper Functions

**File: `backend/src/services/fileService.ts`**

- **Add `parseDateComponents(date: string)`:**
- Parses ISO date string (YYYY-MM-DD) into {year, month, day}
- Returns padded values (month: "01"-"12", day: "01"-"31")
- Handles invalid dates gracefully

- **Add `getReceiptDirByReceiptId(receiptId: number)`:**
- Fetches receipt from database to get user and date
- Calls `getReceiptDir()` with user/date
- Used for backward compatibility in functions that only have receiptId

### 3. Update Route Handlers

**File: `backend/src/routes/receipts.ts`**

- Update file serving endpoint (GET `/api/receipts/:id/files/:filename`) to use new path resolution
- Ensure all file operations pass user and date correctly

**File: `backend/src/routes/export.ts`**

- Update to use new `getReceiptFilePath()` signature

### 4. Update Watch Service

**File: `backend/src/services/watchService.ts`**

- Update `processReceipt()` to use new directory structure when saving files
- Already has access to receipt data with user and date ✓

### 5. Create Migration Function

**File: `backend/src/services/fileService.ts`**

- **Add `migrateFilesToDateStructure()`:**
- Scans all existing receipt directories (old structure)
- For each receipt:
 - Fetches receipt data from database (user, date)
 - Creates new directory structure
 - Moves all files from old location to new location
 - Updates database if needed (filenames should remain the same)
 - Handles errors gracefully (logs and continues)
- Returns migration summary (total receipts, files moved, errors)
- Can be run via API endpoint or CLI script

- **Add migration endpoint** (optional, in `backend/src/routes/settings.ts` or new route):
- POST `/api/migrate-files` - triggers migration
- Returns progress/status

### 6. Update Tests

**Files to update:**

- `backend/__tests__/services/fileService.test.ts` - Update all tests to use new structure
- `backend/__tests__/routes/receipts.test.ts` - Update mocks and expectations
- `backend/__tests__/routes/export.test.ts` - Update path expectations
- `backend/__tests__/services/watchService.test.ts` - Update directory structure mocks
- `backend/__tests__/helpers/testFiles.ts` - Update helper functions

**Test considerations:**

- Test date parsing (various date formats, edge cases)
- Test user name sanitization in paths
- Test migration function
- Test backward compatibility during transition

### 7. Edge Cases to Handle

- **Invalid dates**: Default to current date or "0000/00/00"
- **Empty/missing user**: Default to "unknown" (sanitized)
- **User name with special characters**: Already handled by `sanitizeFilename()`
- **Date changes**: When receipt date is updated, files should be moved to new directory
- **User changes**: When receipt user is updated, files should be moved to new directory
- **Migration safety**: Don't delete old files until migration is verified successful

### 8. Implementation Order

1. Add helper functions (`parseDateComponents`, `getReceiptDirByDate`)
2. Update core file service functions one by one
3. Update route handlers
4. Update watch service
5. Create migration function
6. Update all tests
7. Test migration on sample data
8. Document migration process

### 9. Backward Compatibility

During transition period:

- Support both old and new structures (check both locations)
- Migration can be run incrementally
- Old directories can remain until manually cleaned up

## Files to Modify

- `backend/src/services/fileService.ts` - Core changes
- `backend/src/routes/receipts.ts` - Route updates
- `backend/src/routes/export.ts` - Export path updates
- `backend/src/services/watchService.ts` - Watch service updates
- `backend/__tests__/services/fileService.test.ts` - Test updates
- `backend/__tests__/routes/receipts.test.ts` - Test updates
- `backend/__tests__/routes/export.test.ts` - Test updates
- `backend/__tests__/services/watchService.test.ts` - Test updates
- `backend/__tests__/helpers/testFiles.ts` - Test helper updates

## Migration Strategy

1. **Development/Testing**: Test migration on development database with sample data
2. **Backup**: Ensure database and file system are backed up before migration
3. **Staged Rollout**:

- Deploy code changes (supports both old and new structures)
- Run migration script
- Verify files are accessible
- Clean up old directories after verification period

4. **Rollback Plan**: Keep old directory structure code commented/available for quick rollback if needed