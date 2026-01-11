-- Migration: 001_initial_schema
-- Description: Create initial database schema with receipts, users, receipt_types, flags, and related tables
-- Date: 2024-01-01

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create receipt_types table (basic version, will be extended in later migrations)
CREATE TABLE IF NOT EXISTS receipt_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  receipt_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  vendor TEXT NOT NULL,
  provider_address TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (receipt_type_id) REFERENCES receipt_types(id)
);

-- Create receipt_files table
CREATE TABLE IF NOT EXISTS receipt_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
);

-- Create flags table
CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create receipt_flags junction table
CREATE TABLE IF NOT EXISTS receipt_flags (
  receipt_id INTEGER NOT NULL,
  flag_id INTEGER NOT NULL,
  PRIMARY KEY (receipt_id, flag_id),
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (flag_id) REFERENCES flags(id) ON DELETE CASCADE
);

-- Create receipt_type_groups table
CREATE TABLE IF NOT EXISTS receipt_type_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_type_id ON receipts(receipt_type_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipt_files_receipt_id ON receipt_files(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_flags_receipt_id ON receipt_flags(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_flags_flag_id ON receipt_flags(flag_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_receipt_types_name ON receipt_types(name);
