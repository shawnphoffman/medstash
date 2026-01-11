-- Migration: 002_add_lookup_tables
-- Description: Ensure indexes exist for lookup table relationships
-- Date: 2024-01-01
-- Note: Migration 001 creates the schema with user_id and receipt_type_id columns.
-- This migration ensures all necessary indexes are in place for the lookup table relationships.
-- The complex data migration from old schema (user TEXT, type TEXT) to new schema
-- is handled by application code in db.ts for legacy databases.

-- Ensure indexes exist for foreign key relationships
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_type_id ON receipts(receipt_type_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipt_files_receipt_id ON receipt_files(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_flags_receipt_id ON receipt_flags(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_flags_flag_id ON receipt_flags(flag_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_receipt_types_name ON receipt_types(name);
