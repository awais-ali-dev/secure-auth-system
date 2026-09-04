// Uses Node's built-in SQLite module (node:sqlite) instead of a third-party
// native addon like better-sqlite3 — this avoids the need for a C++ build
// toolchain (Visual Studio Build Tools on Windows, Xcode CLI tools on Mac)
// just to run a demo project. Requires Node.js 22.5+.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'users.db'));

// Sensitive columns (email, phone, ssn/national_id) are stored ENCRYPTED
// (see utils/encryption.js). two_factor_secret is also stored encrypted,
// since it's just as sensitive as a password.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    display_name TEXT,
    email_encrypted TEXT NOT NULL,
    phone_encrypted TEXT,
    national_id_encrypted TEXT,
    two_factor_secret_encrypted TEXT,
    two_factor_enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
