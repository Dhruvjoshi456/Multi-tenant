import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

db.exec(`
CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS user_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    type TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

console.log('Database initialized.');

// Example: Define and use insertUserStmt
const insertUserStmt = db.prepare(`
  INSERT INTO users (email, password, first_name, last_name, role, tenant_id, is_verified, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

// Example variables (replace with actual values)
const email = 'user@example.com';
const hashedPassword = 'hashedpassword';
const firstName = 'First';
const lastName = 'Last';
const tenant = { id: 1 };

const result = insertUserStmt.run(email, hashedPassword, firstName, lastName, 'member', tenant.id, 0);

db.close();