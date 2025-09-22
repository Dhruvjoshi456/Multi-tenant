import Database from 'better-sqlite3';
import { Pool } from 'pg';

let sqliteDb: Database.Database | null = null;
let pgPool: Pool | null = null;

const hasPostgresUrl = Boolean(process.env.DATABASE_URL);

// Postgres wrapper: prepare(...).get/all/run return Promises
export class PostgresWrapper {
  private pool: Pool;
  constructor(pool: Pool) {
    this.pool = pool;
  }

  prepare(sql: string) {
    return {
      get: async (params: any[] = []) => {
        const res = await this.pool.query(sql, params);
        return res.rows[0] ?? null;
      },
      all: async (params: any[] = []) => {
        const res = await this.pool.query(sql, params);
        return res.rows;
      },
      run: async (params: any[] = []) => {
        // Recommend using `RETURNING id` for inserts when you need the id
        const res = await this.pool.query(sql, params);
        return {
          lastInsertRowid: res.rows[0]?.id ?? null,
          rowCount: res.rowCount
        };
      }
    };
  }
}

export async function getDatabase() {
  if (hasPostgresUrl) return getPostgresDatabase();
  return getSQLiteDatabase();
}

function getSQLiteDatabase() {
  if (!sqliteDb) {
    sqliteDb = new Database('database.sqlite');
    // run migrations / ensure tables exist
    migrateSqliteSchema(sqliteDb);
  }

  // Return an object with .prepare(...).get/all/run that are async to match PostgresWrapper
  return {
    prepare: (sql: string) => {
      const stmt = sqliteDb!.prepare(sql);
      return {
        get: async (params: any[] = []) => stmt.get(...(Array.isArray(params) ? params : [params])),
        all: async (params: any[] = []) => stmt.all(...(Array.isArray(params) ? params : [params])),
        run: async (params: any[] = []) => {
          const info = stmt.run(...(Array.isArray(params) ? params : [params]));
          return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
        }
      };
    }
  };
}

function getPostgresDatabase() {
  if (!pgPool) {
    const connOpts: any = { connectionString: process.env.DATABASE_URL };
    // Neon / Vercel Postgres requires SSL
    connOpts.ssl = { rejectUnauthorized: false };
    pgPool = new Pool(connOpts);
  }
  return new PostgresWrapper(pgPool);
}

// Lightweight sqlite migration function (keep your existing migration logic)
function migrateSqliteSchema(sqliteDb: Database.Database) {
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
      is_verified INTEGER NOT NULL DEFAULT 0,
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
}
