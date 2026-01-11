-- Migration: 004_add_optimization_tracking
-- Description: Add is_optimized and optimized_at columns to receipt_files table
-- Date: 2024-01-01

-- Add is_optimized column to receipt_files
-- Note: The migration service will check if this column exists before adding it
ALTER TABLE receipt_files ADD COLUMN is_optimized INTEGER NOT NULL DEFAULT 0;

-- Add optimized_at column to receipt_files
ALTER TABLE receipt_files ADD COLUMN optimized_at TEXT;
