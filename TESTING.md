# Testing Guide

This document describes the test suite for MedStash and how to run tests.

## Test Framework

MedStash uses [Vitest](https://vitest.dev/) for both backend and frontend testing. Vitest is a fast, Vite-native test runner that provides excellent TypeScript support and is compatible with Jest APIs.

## Setup

Before running tests, ensure all dependencies are installed. Since this project uses npm workspaces, you can install all dependencies from the root:

```bash
# From the project root directory
npm install
```

This will automatically install dependencies for both `backend/` and `frontend/` workspaces.

## Running Tests

### Backend Tests

From the `backend/` directory:

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Frontend Tests

From the `frontend/` directory:

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Running Tests from Root

You can run tests from the project root directory using npm workspaces:

```bash
# Run all tests (backend then frontend)
npm test

# Run only backend tests
npm run test:backend

# Run only frontend tests
npm run test:frontend

# Run tests in watch mode (backend)
npm run test:watch:backend

# Run tests in watch mode (frontend)
npm run test:watch:frontend

# Run tests with coverage (both)
npm run test:coverage

# Run tests with coverage (backend only)
npm run test:coverage:backend

# Run tests with coverage (frontend only)
npm run test:coverage:frontend
```

Alternatively, you can use npm workspace commands directly:

```bash
# Backend tests
npm run test -w backend

# Frontend tests
npm run test -w frontend
```

## Test Structure

### Backend Tests (`backend/__tests__/`)

#### Test Files
- **`routes/`** - API endpoint tests
  - `receipts.test.ts` - Receipt CRUD operations, file uploads, flags
  - `flags.test.ts` - Flag CRUD operations
  - `settings.test.ts` - Settings get/set operations
  - `export.test.ts` - Bulk export functionality
- **`services/`** - Business logic tests
  - `dbService.test.ts` - Database operations (receipts, flags, settings)
  - `fileService.test.ts` - File operations (save, delete, optimize)
- **`utils/`** - Utility function tests
  - `filename.test.ts` - Filename generation and sanitization

#### Test Helpers (`backend/__tests__/helpers/`)
- `testDb.ts` - In-memory SQLite database setup/teardown
- `testServer.ts` - Express app instance for HTTP testing
- `testFiles.ts` - Temporary file system helpers
- `fixtures.ts` - Test data factories

### Frontend Tests (`frontend/src/__tests__/`)

#### Test Files
- **`lib/`** - API client tests
  - `api.test.ts` - API client methods and FormData handling
- **`components/`** - React component tests
  - `ReceiptCard.test.tsx` - Receipt card display and interactions
  - `UserSetupDialog.test.tsx` - User setup form validation and submission

#### Test Helpers (`frontend/src/__tests__/helpers/`)
- `testUtils.tsx` - Custom render function with React Router provider
- `fixtures.ts` - Test data factories
- `mockApi.ts` - API mocking utilities

## What's Tested

### Backend

#### API Routes
- ✅ GET endpoints (list, get by ID, 404 handling)
- ✅ POST endpoints (create with validation)
- ✅ PUT endpoints (update, partial updates)
- ✅ DELETE endpoints (cascade deletes)
- ✅ File upload/download
- ✅ Query parameter filtering
- ✅ Error handling (400, 404, 500)

#### Services
- ✅ Database CRUD operations
- ✅ File operations (save, delete, optimize)
- ✅ Image optimization (WebP conversion)
- ✅ Flag associations
- ✅ Settings management

#### Utilities
- ✅ Filename generation
- ✅ Filename sanitization
- ✅ Edge cases and error handling

### Frontend

#### API Client
- ✅ All API methods (receipts, flags, settings, export)
- ✅ FormData handling for file uploads
- ✅ Error handling

#### Components
- ✅ Component rendering
- ✅ User interactions (clicks, form submission)
- ✅ Form validation
- ✅ Conditional rendering
- ✅ Data formatting (dates, currency)

## Coverage Reports

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

### Viewing Coverage

After running coverage, you can:
- View HTML report: Open `coverage/index.html` in a browser
- View terminal output: Coverage summary is printed to the console
- JSON report: Available at `coverage/coverage-final.json`

### Coverage Goals

- **Backend**: Focus on business logic, API contracts, and error handling
- **Frontend**: Focus on user interactions, form validation, and API integration
- **Target**: 70-80% coverage of critical paths

## Writing New Tests

### Backend Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testServer';
import { setupTestDb, clearTestDb } from '../helpers/testDb';

describe('My New Feature', () => {
  const app = createTestApp();

  beforeEach(() => {
    clearTestDb();
  });

  it('should do something', async () => {
    const response = await request(app)
      .get('/api/my-endpoint')
      .expect(200);

    expect(response.body).toEqual({ /* expected data */ });
  });
});
```

### Frontend Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../helpers/testUtils';
import userEvent from '@testing-library/user-event';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Setup/Teardown**: Use `beforeEach` and `afterEach` to reset state
3. **Fixtures**: Use test fixtures for consistent test data
4. **Mocking**: Mock external dependencies (APIs, file system)
5. **Descriptive Names**: Use clear, descriptive test names
6. **AAA Pattern**: Arrange, Act, Assert structure

## Troubleshooting

### Tests Failing with Database Errors
- Ensure test database is properly set up in `beforeEach`
- Check that `clearTestDb()` is called in `afterEach`

### Tests Failing with File System Errors
- Ensure test directories are cleaned up in `afterEach`
- Check that `cleanupTestFiles()` is called

### Frontend Tests Not Finding Elements
- Use `screen.debug()` to see the rendered output
- Check that components are wrapped in necessary providers (Router, etc.)
- Verify that async operations are properly awaited

### Coverage Not Generating
- Ensure `@vitest/coverage-v8` is installed (included with vitest)
- Check that coverage provider is set to 'v8' in vitest.config.ts

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Backend Tests
  run: |
    cd backend
    npm test

- name: Run Frontend Tests
  run: |
    cd frontend
    npm test
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

