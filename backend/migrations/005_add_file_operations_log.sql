CREATE TABLE IF NOT EXISTS file_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER,
    file_id INTEGER,
    operation TEXT NOT NULL,
    old_path TEXT,
    new_path TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_operations_receipt ON file_operations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_file_operations_created ON file_operations(created_at);
