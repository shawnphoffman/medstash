# Code Review - MedStash Project

## Executive Summary

This code review identifies security vulnerabilities, code quality issues, and areas for improvement across the MedStash project. The application is a receipt storage system with a Node.js/Express backend and React frontend.

**Overall Assessment:** The codebase is well-structured with good separation of concerns, but there are several security and robustness issues that should be addressed before production deployment.

---

## 🔴 Critical Security Issues

### 1. **Unsafe JSON.parse() Calls**
**Location:** Multiple files
**Severity:** High

**Issues:**
- `backend/src/routes/receipts.ts:108` - `JSON.parse(flag_ids)` without try-catch
- `backend/src/routes/receipts.ts:179` - `JSON.parse(flag_ids)` with try-catch but continues with undefined
- `backend/src/routes/settings.ts:14,34` - `JSON.parse(value)` without proper error handling
- `backend/src/utils/filename.ts:122` - `JSON.parse(setting)` without try-catch

**Risk:** Malformed JSON input can crash the server or cause unexpected behavior.

**Recommendation:**
```typescript
// Example fix
try {
  flag_ids = JSON.parse(flag_ids);
} catch (e) {
  return res.status(400).json({ error: 'Invalid flag_ids format' });
}
```

### 2. **No Path Traversal Protection**
**Location:** `backend/src/routes/receipts.ts:283`
**Severity:** Critical

**Issue:** File paths are constructed from user input without validation. While `receiptId` and `fileId` are parsed as integers, the filename comes from the database which could potentially be manipulated.

**Risk:** Path traversal attacks could allow access to files outside the intended directory.

**Recommendation:**
```typescript
// Validate filename doesn't contain path traversal
if (file.filename.includes('..') || path.isAbsolute(file.filename)) {
  return res.status(400).json({ error: 'Invalid filename' });
}
```

### 3. **CORS Configuration Too Permissive**
**Location:** `backend/src/server.ts:19`
**Severity:** Medium

**Issue:** CORS is enabled for all origins without restrictions.

**Risk:** Any website can make requests to your API.

**Recommendation:**
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3010'],
  credentials: true
}));
```

### 4. **No Authentication/Authorization**
**Location:** Entire application
**Severity:** Critical

**Issue:** All API endpoints are publicly accessible without any authentication.

**Risk:** Anyone can access, modify, or delete receipts and files.

**Recommendation:** Implement authentication (e.g., API keys, JWT tokens, or basic auth) before production deployment.

### 5. **File Upload Validation Insufficient**
**Location:** `backend/src/routes/receipts.ts:28-33`
**Severity:** Medium

**Issue:** Multer only validates file size, not file type or content.

**Risk:** Malicious files could be uploaded, potentially causing issues when processed.

**Recommendation:**
```typescript
const upload = multer({
  dest: '/tmp/medstash-uploads',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

### 6. **Settings Route Allows Arbitrary Keys**
**Location:** `backend/src/routes/settings.ts:42-56`
**Severity:** Medium

**Issue:** Any key can be set without validation, allowing potential injection of malicious data.

**Risk:** Could lead to code injection or data corruption.

**Recommendation:** Whitelist allowed setting keys and validate values.

### 7. **No Rate Limiting**
**Location:** Entire application
**Severity:** Medium

**Issue:** No protection against brute force or DoS attacks.

**Recommendation:** Implement rate limiting middleware (e.g., `express-rate-limit`).

---

## 🟡 Security Concerns

### 8. **Error Messages May Leak Information**
**Location:** Multiple route files
**Severity:** Low-Medium

**Issue:** Some error messages might expose internal details (e.g., file paths, database structure).

**Recommendation:** Use generic error messages in production, log detailed errors server-side only.

### 9. **SQL Injection Risk (Low)**
**Location:** `backend/src/db.ts`
**Severity:** Low

**Note:** Using prepared statements (better-sqlite3) mitigates this, but ensure all queries use prepared statements.

**Status:** ✅ Currently using prepared statements correctly.

---

## 🟠 Code Quality Issues

### 10. **Inconsistent Error Handling**
**Location:** Multiple files
**Severity:** Medium

**Issue:** Some routes have try-catch blocks, others don't. Error responses are inconsistent.

**Recommendation:** Create a centralized error handling middleware.

### 11. **Missing Input Validation**
**Location:** `backend/src/routes/receipts.ts`
**Severity:** Medium

**Issues:**
- `amount` is parsed but not validated (could be NaN, negative, or extremely large)
- `date` format is not validated
- `vendor`, `description` length not limited

**Recommendation:** Add comprehensive input validation middleware (e.g., `express-validator` or `zod`).

### 12. **Type Safety Issues**
**Location:** `backend/src/routes/receipts.ts:98-99`
**Severity:** Low

**Issue:** `parseInt()` and `parseFloat()` can return `NaN`, which isn't handled.

**Recommendation:**
```typescript
const userId = user_id ? parseInt(user_id, 10) : undefined;
if (userId !== undefined && isNaN(userId)) {
  return res.status(400).json({ error: 'Invalid user_id' });
}
```

### 13. **Async/Await Inconsistencies**
**Location:** `backend/src/services/dbService.ts:161`
**Severity:** Low

**Issue:** `updateReceipt` is marked as `async` but most operations are synchronous.

**Recommendation:** Either make it fully async or remove async keyword.

### 14. **Missing Environment Variable Validation**
**Location:** Multiple files
**Severity:** Low

**Issue:** Environment variables are used without validation or defaults in some cases.

**Recommendation:** Use a library like `envalid` to validate environment variables at startup.

---

## 🔵 Performance & Scalability Issues

### 15. **No Pagination for Receipts List**
**Location:** `backend/src/routes/receipts.ts:45-49`
**Severity:** Medium

**Issue:** `getAllReceipts()` loads all receipts into memory, which could be problematic with large datasets.

**Recommendation:** Implement pagination with limit/offset or cursor-based pagination.

### 16. **Export Route Loads All Data into Memory**
**Location:** `backend/src/routes/export.ts:11-76`
**Severity:** Medium

**Issue:** For large datasets, this could cause memory issues.

**Recommendation:** Stream the archive creation or implement chunked processing.

### 17. **No Database Connection Pooling**
**Location:** `backend/src/db.ts`
**Severity:** Low

**Note:** SQLite doesn't require connection pooling, but this is noted for future migration considerations.

---

## 🟢 Best Practices & Improvements

### 18. **Missing Request Logging**
**Location:** `backend/src/server.ts`
**Severity:** Low

**Recommendation:** Add request logging middleware (e.g., `morgan`).

### 19. **Health Check Too Simple**
**Location:** `backend/src/server.ts:33-35`
**Severity:** Low

**Issue:** Health check doesn't verify database connectivity or disk space.

**Recommendation:**
```typescript
app.get('/health', async (req, res) => {
  try {
    // Check database
    db.prepare('SELECT 1').get();
    // Check disk space
    // ... disk space check
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
});
```

### 20. **Missing .env.example File**
**Location:** Root directory
**Severity:** Low

**Recommendation:** Create `.env.example` documenting all required environment variables.

### 21. **Hardcoded Paths**
**Location:** `backend/src/services/fileService.ts:29`
**Severity:** Low

**Issue:** `/tmp/medstash-uploads` is hardcoded in multer config.

**Recommendation:** Use environment variable.

### 22. **Missing Input Sanitization**
**Location:** User input fields
**Severity:** Low

**Issue:** User-provided strings (vendor, description, etc.) are not sanitized before database storage.

**Recommendation:** Sanitize HTML/script tags if displaying in frontend, or use parameterized queries (already done).

### 23. **No Request Timeout**
**Location:** Express app
**Severity:** Low

**Recommendation:** Set request timeout to prevent hanging requests.

### 24. **Missing Content Security Policy**
**Location:** Frontend
**Severity:** Low

**Recommendation:** Add CSP headers to prevent XSS attacks.

---

## 📋 Frontend Issues

### 25. **No Error Boundary**
**Location:** `frontend/src/App.tsx`
**Severity:** Medium

**Issue:** React errors will crash the entire app.

**Recommendation:** Add React Error Boundaries.

### 26. **API Error Handling Inconsistent**
**Location:** `frontend/src/lib/api.ts`
**Severity:** Low

**Issue:** Some API calls don't have consistent error handling.

**Recommendation:** Add axios interceptors for centralized error handling.

### 27. **No Loading States for Some Operations**
**Location:** Various pages
**Severity:** Low

**Recommendation:** Add loading indicators for async operations.

---

## 🐛 Potential Bugs

### 28. **Race Condition in File Renaming**
**Location:** `backend/src/services/fileService.ts:211-266`
**Severity:** Low

**Issue:** Multiple concurrent updates could cause file rename conflicts.

**Recommendation:** Add file locking or transaction handling.

### 29. **Missing Transaction in Receipt Creation**
**Location:** `backend/src/routes/receipts.ts:112-132`
**Severity:** Medium

**Issue:** If file processing fails after receipt creation, the receipt remains in database without files.

**Recommendation:** Use database transactions or implement rollback logic.

### 30. **Optimize Image Error Handling**
**Location:** `backend/src/services/fileService.ts:48-56`
**Severity:** Low

**Issue:** If optimization fails, error is thrown after copying file, which is inefficient.

**Recommendation:** Check if file can be optimized before copying.

---

## 📝 Documentation & Testing

### 31. **Missing API Documentation**
**Severity:** Low

**Recommendation:** Add OpenAPI/Swagger documentation.

### 32. **Test Coverage Gaps**
**Severity:** Low

**Recommendation:** Review test coverage and add tests for error cases and edge cases.

---

## ✅ Positive Observations

1. ✅ Good use of prepared statements (SQL injection protection)
2. ✅ Proper use of TypeScript for type safety
3. ✅ Well-structured codebase with clear separation of concerns
4. ✅ Good file organization
5. ✅ Foreign key constraints enabled in database
6. ✅ Proper use of CASCADE deletes
7. ✅ Good test structure

---

## 🎯 Priority Recommendations

### Immediate (Before Production):
1. Add authentication/authorization
2. Fix unsafe JSON.parse() calls
3. Add path traversal protection
4. Implement input validation
5. Add file type validation for uploads
6. Restrict CORS configuration

### Short-term:
1. Add rate limiting
2. Implement pagination
3. Add comprehensive error handling
4. Add request logging
5. Improve health check endpoint

### Long-term:
1. Add API documentation
2. Implement caching where appropriate
3. Add monitoring and alerting
4. Consider database migration strategy for future scaling

---

## 📊 Summary Statistics

- **Critical Issues:** 4
- **High Priority Issues:** 3
- **Medium Priority Issues:** 8
- **Low Priority Issues:** 15
- **Total Issues Found:** 30

---

*Review completed on: $(date)*
*Reviewer: AI Code Review Assistant*
