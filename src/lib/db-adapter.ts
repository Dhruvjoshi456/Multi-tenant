import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { PostgresWrapper } from './database';

// Database adapter to handle both SQLite and PostgreSQL
export class DatabaseAdapter {
  private db: Database.Database | Pool | PostgresWrapper;
  private isPostgres: boolean;

  constructor(db: Database.Database | Pool | PostgresWrapper) {
    this.db = db;
    this.isPostgres = 'query' in db || 'prepare' in db; // PostgreSQL Pool or PostgresWrapper
  }

  // Execute a query and return results
  async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    if (this.isPostgres) {
      if ('query' in this.db) {
        const result = await (this.db as Pool).query(sql, params);
        return result.rows;
      } else {
        // PostgresWrapper
        const stmt = (this.db as PostgresWrapper).prepare(sql);
        return await stmt.all(...params);
      }
    } else {
      const stmt = (this.db as Database.Database).prepare(sql);
      return stmt.all(...params);
    }
  }

  // Get a single row
  async get(sql: string, params: unknown[] = []): Promise<unknown> {
    if (this.isPostgres) {
      if ('query' in this.db) {
        const result = await (this.db as Pool).query(sql, params);
        return result.rows[0] || null;
      } else {
        // PostgresWrapper
        const stmt = (this.db as PostgresWrapper).prepare(sql);
        return await stmt.get(...params);
      }
    } else {
      const stmt = (this.db as Database.Database).prepare(sql);
      return stmt.get(...params);
    }
  }

  // Execute a query without returning results (INSERT, UPDATE, DELETE)
  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid?: number; changes: number }> {
    if (this.isPostgres) {
      if ('query' in this.db) {
        const result = await (this.db as Pool).query(sql, params);
        return {
          lastInsertRowid: result.rows[0]?.id,
          changes: result.rowCount || 0
        };
      } else {
        // PostgresWrapper
        const stmt = (this.db as PostgresWrapper).prepare(sql);
        return await stmt.run(...params);
      }
    } else {
      const stmt = (this.db as Database.Database).prepare(sql);
      const result = stmt.run(...params);
      return {
        lastInsertRowid: Number(result.lastInsertRowid),
        changes: result.changes
      };
    }
  }

  // Prepare a statement (for SQLite compatibility)
  prepare(sql: string) {
    if (this.isPostgres) {
      // For PostgreSQL, we'll return a mock object that works with our adapter
      return {
        get: (params: unknown[]) => this.get(sql, params),
        all: (params: unknown[]) => this.query(sql, params),
        run: (params: unknown[]) => this.run(sql, params)
      };
    } else {
      return (this.db as Database.Database).prepare(sql);
    }
  }

  // Close the database connection
  async close() {
    if (this.isPostgres) {
      await (this.db as Pool).end();
    } else {
      (this.db as Database.Database).close();
    }
  }
}

// Helper function to get database adapter
export async function getDatabaseAdapter() {
  const { getDatabase } = await import('./database');
  const db = getDatabase();
  return new DatabaseAdapter(db);
}
