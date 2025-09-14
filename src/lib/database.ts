import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { DatabaseAdapter } from './db-adapter';

let db: Database.Database | null = null;
let pgPool: Pool | null = null;

// Check if we're in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

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
  return pgPool;
}

// Export both database types for type safety
export type DatabaseType = Database.Database | Pool;

// Export database adapter for consistent usage
export function getDatabaseAdapter() {
  const db = getDatabase();
  return new DatabaseAdapter(db);
}
