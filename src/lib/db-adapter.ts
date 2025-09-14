import { Pool } from 'pg';
import Database from 'better-sqlite3';

// Database adapter to handle both SQLite and PostgreSQL
export class DatabaseAdapter {
  private db: Database.Database | Pool;
  private isPostgres: boolean;

  constructor(db: Database.Database | Pool) {
    this.db = db;
    this.isPostgres = 'query' in db; // PostgreSQL Pool has query method
  }

  // Execute a query and return results
  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (this.isPostgres) {
      const result = await (this.db as Pool).query(sql, params);
      return result.rows;
    } else {
      const stmt = (this.db as Database.Database).prepare(sql);
      return stmt.all(...params);
    }
  }

  // Get a single row
  async get(sql: string, params: any[] = []): Promise<any> {
    if (this.isPostgres) {
      const result = await (this.db as Pool).query(sql, params);
      return result.rows[0] || null;
    } else {
      const stmt = (this.db as Database.Database).prepare(sql);
      return stmt.get(...params);
    }
  }

  // Execute a query without returning results (INSERT, UPDATE, DELETE)
  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid?: number; changes: number }> {
    if (this.isPostgres) {
      const result = await (this.db as Pool).query(sql, params);
      return {
        lastInsertRowid: result.rows[0]?.id,
        changes: result.rowCount || 0
      };
    } else {
      const stmt = (this.db as Database.Database).prepare(sql);
      const result = stmt.run(...params);
      return {
        lastInsertRowid: result.lastInsertRowid,
        changes: result.changes
      };
    }
  }

  // Prepare a statement (for SQLite compatibility)
  prepare(sql: string) {
    if (this.isPostgres) {
      // For PostgreSQL, we'll return a mock object that works with our adapter
      return {
        get: (params: any[]) => this.get(sql, params),
        all: (params: any[]) => this.query(sql, params),
        run: (params: any[]) => this.run(sql, params)
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
export function getDatabaseAdapter() {
  const { getDatabase } = require('./database');
  const db = getDatabase();
  return new DatabaseAdapter(db);
}
