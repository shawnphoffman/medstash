-- Migration: 003_add_receipt_type_groups
-- Description: Add receipt_type_groups table and add group_id/display_order columns to receipt_types
-- Date: 2024-01-01

-- Ensure receipt_type_groups table exists (should already exist from 001, but be safe)
CREATE TABLE IF NOT EXISTS receipt_type_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add group_id column to receipt_types if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- This will fail if the column already exists, but migration tracking ensures this only runs once
-- For idempotency, we'll wrap in error handling at the service level
ALTER TABLE receipt_types ADD COLUMN group_id INTEGER;

-- Add display_order column to receipt_types if it doesn't exist
ALTER TABLE receipt_types ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- Create default group "Other Eligible Expenses" and assign existing types to it
-- This uses a subquery approach that works in SQLite
INSERT OR IGNORE INTO receipt_type_groups (name, display_order) 
VALUES ('Other Eligible Expenses', 0);

-- Update existing receipt_types to have display_order based on alphabetical order
-- We'll set group_id to the default group for existing types
UPDATE receipt_types
SET group_id = (SELECT id FROM receipt_type_groups WHERE name = 'Other Eligible Expenses' LIMIT 1),
    display_order = (
      SELECT COUNT(*) 
      FROM receipt_types rt2 
      WHERE rt2.name <= receipt_types.name 
        AND (rt2.group_id IS NULL OR rt2.group_id = receipt_types.group_id)
    ) - 1
WHERE group_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_types_group_id ON receipt_types(group_id);
CREATE INDEX IF NOT EXISTS idx_receipt_type_groups_display_order ON receipt_type_groups(display_order);
