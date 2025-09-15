import Database from 'better-sqlite3';
import { Pool } from 'pg';

let db: Database.Database | null = null;
let pgPool: Pool | null = null;

// Check if we're in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

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
  // Use PostgreSQL in production/Vercel, SQLite in development
  if (isProduction || isVercel) {
    return getPostgresDatabase();
  } else {
    return getSQLiteDatabase();
  }
}

function getSQLiteDatabase() {
  if (!db) {
    db = new Database('database.sqlite');
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
