import { CreateReceiptInput, CreateFlagInput, CreateUserInput, CreateReceiptTypeInput } from '../../src/models/receipt';

/**
 * Create a test receipt input with defaults
 * Note: user_id and receipt_type_id should be provided, or user/type strings will be resolved
 */
export function createReceiptFixture(overrides?: Partial<CreateReceiptInput>): CreateReceiptInput {
  return {
    user: 'Test User',
    type: 'doctor-visit',
    amount: 100.50,
    vendor: 'Test Clinic',
    provider_address: '123 Test St, Test City, TS 12345',
    description: 'Test description',
    date: '2024-01-15',
    notes: 'Test notes',
    ...overrides,
  };
}

/**
 * Create a test user input
 */
export function createUserFixture(overrides?: Partial<CreateUserInput>): CreateUserInput {
  return {
    name: 'Test User',
    ...overrides,
  };
}

/**
 * Create a test receipt type input
 */
export function createReceiptTypeFixture(overrides?: Partial<CreateReceiptTypeInput>): CreateReceiptTypeInput {
  return {
    name: 'doctor-visit',
    ...overrides,
  };
}

/**
 * Create a test flag input
 */
export function createFlagFixture(overrides?: Partial<CreateFlagInput>): CreateFlagInput {
  return {
    name: 'Test Flag',
    color: '#FF0000',
    ...overrides,
  };
}

/**
 * Create a mock Multer file
 */
export function createMockFile(overrides?: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    destination: '/tmp',
    filename: 'test-123.pdf',
    path: '/tmp/test-123.pdf',
    buffer: Buffer.from('test content'),
    ...overrides,
  } as Express.Multer.File;
}

