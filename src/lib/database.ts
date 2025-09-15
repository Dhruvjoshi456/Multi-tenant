import Database from 'better-sqlite3';
import { Pool } from 'pg';

let db: Database.Database | null = null;
let pgPool: Pool | null = null;

// Environment flags
const isProduction = process.env.NODE_ENV === 'production';
const hasPostgresUrl = Boolean(process.env.DATABASE_URL);

// Create a wrapper that makes PostgreSQL Pool look like SQLite Database
export class PostgresWrapper {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  prepare(sql: string) {
    // Convert SQLite syntax to PostgreSQL
    const pgSql = sql
      .replace(/datetime\('now'\)/g, 'NOW()')
      .replace(/datetime\(/g, 'NOW()')
      .replace(/\?/g, (match, offset, string) => {
        // Count how many ? we've seen so far
        const before = string.substring(0, offset);
        const count = (before.match(/\?/g) || []).length;
        return `$${count + 1}`;
      });

    return {
      get: async (...params: unknown[]) => {
        const result = await this.pool.query(pgSql, params);
        return result.rows[0] || null;
      },
      run: async (...params: unknown[]) => {
        const result = await this.pool.query(pgSql, params);
        return {
          lastInsertRowid: result.rows[0]?.id,
          changes: result.rowCount || 0
        };
      },
      all: async (...params: unknown[]) => {
        const result = await this.pool.query(pgSql, params);
        return result.rows;
      }
    };
  }
}

export function getDatabase() {
  // Prefer PostgreSQL only when DATABASE_URL is configured; otherwise use SQLite
  if (hasPostgresUrl) return getPostgresDatabase();
  return getSQLiteDatabase();
}

function getSQLiteDatabase() {
  if (!db) {
    // Use writable path on serverless platforms (e.g., Vercel)
    const dbPath = isProduction && !hasPostgresUrl ? '/tmp/database.sqlite' : 'database.sqlite';
    db = new Database(dbPath);
    // Ensure required tables/columns exist for SQLite
    migrateSqliteSchema(db);
  }
  return db;
}

function getPostgresDatabase() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return new PostgresWrapper(pgPool);
}

// Export both database types for type safety
export type DatabaseType = Database.Database | PostgresWrapper;

// Lightweight, idempotent migration for SQLite to match app expectations
function migrateSqliteSchema(sqliteDb: Database.Database) {
  // Create tables if they don't exist (base schema)
  sqliteDb.exec(`
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

  // Idempotently add missing columns to tenants
  const tenantColumns = sqliteDb.prepare("PRAGMA table_info(tenants)").all() as Array<{ name: string }>;
  const tenantColumnNames = new Set(tenantColumns.map((c) => c.name));

  if (!tenantColumnNames.has('subscription_plan')) {
    sqliteDb.exec("ALTER TABLE tenants ADD COLUMN subscription_plan TEXT DEFAULT 'free'");
  }
  if (!tenantColumnNames.has('theme_color')) {
    sqliteDb.exec("ALTER TABLE tenants ADD COLUMN theme_color TEXT");
  }
  if (!tenantColumnNames.has('logo')) {
    sqliteDb.exec("ALTER TABLE tenants ADD COLUMN logo TEXT");
  }
  if (!tenantColumnNames.has('created_at')) {
    sqliteDb.exec("ALTER TABLE tenants ADD COLUMN created_at TEXT DEFAULT (datetime('now'))");
  }
  if (!tenantColumnNames.has('updated_at')) {
    sqliteDb.exec("ALTER TABLE tenants ADD COLUMN updated_at TEXT");
  }
}
