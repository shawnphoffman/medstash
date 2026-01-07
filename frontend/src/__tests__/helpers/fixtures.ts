import { Receipt, Flag } from '../../lib/api';

/**
 * Create a test receipt with defaults
 */
export function createReceiptFixture(overrides?: Partial<Receipt>): Receipt {
  return {
    id: 1,
    user: 'Test User',
    type: 'doctor-visit',
    amount: 100.50,
    vendor: 'Test Clinic',
    provider_address: '123 Test St, Test City, TS 12345',
    description: 'Test description',
    date: '2024-01-15',
    notes: 'Test notes',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    files: [],
    flags: [],
    ...overrides,
  };
}

/**
 * Create a test flag with defaults
 */
export function createFlagFixture(overrides?: Partial<Flag>): Flag {
  return {
    id: 1,
    name: 'Test Flag',
    color: '#FF0000',
    created_at: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

