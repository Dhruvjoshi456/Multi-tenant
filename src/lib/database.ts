import Database from 'better-sqlite3';


let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    db = new Database('database.sqlite'); // or your DB file path
  }
  return db;
}
