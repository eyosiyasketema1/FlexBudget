import * as SQLite from 'expo-sqlite';

// Local-only SQLite via expo-sqlite. Runs in Expo Go — no native dev build.
// Money is stored as INTEGER cents; booleans as 0/1. Every income/expense row
// carries `month_year` so months are fully isolated.

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  // v4 db file: 50/20/20/10 template (Needs/Wants/Savings/Church), 0 spent.
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('flexbudget_v4.db');
  return dbPromise;
}

const DDL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS months (
  month_year   TEXT PRIMARY KEY NOT NULL,
  is_locked    INTEGER NOT NULL DEFAULT 0,
  saved_cents  INTEGER,            -- confirmed amount saved for the period (NULL = not yet confirmed)
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS income_items (
  id           TEXT PRIMARY KEY NOT NULL,
  month_year   TEXT NOT NULL,
  label        TEXT NOT NULL,
  category     TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  is_archived  INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_income_month ON income_items(month_year);

CREATE TABLE IF NOT EXISTS expense_categories (
  id                     TEXT PRIMARY KEY NOT NULL,
  month_year             TEXT NOT NULL,
  name                   TEXT NOT NULL,
  allocation_cap_percent REAL,
  bucket                 TEXT,
  is_archived            INTEGER NOT NULL DEFAULT 0,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  created_at             INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cat_month ON expense_categories(month_year);

CREATE TABLE IF NOT EXISTS expense_items (
  id                 TEXT PRIMARY KEY NOT NULL,
  category_id        TEXT NOT NULL,
  month_year         TEXT NOT NULL,
  name               TEXT NOT NULL,
  budget_cap_cents   INTEGER NOT NULL DEFAULT 0,
  actual_spent_cents INTEGER NOT NULL DEFAULT 0,
  rollover_enabled   INTEGER NOT NULL DEFAULT 0,
  rollover_cents     INTEGER NOT NULL DEFAULT 0,
  is_archived        INTEGER NOT NULL DEFAULT 0,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_item_cat ON expense_items(category_id);
CREATE INDEX IF NOT EXISTS idx_item_month ON expense_items(month_year);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS expense_entries (
  id           TEXT PRIMARY KEY NOT NULL,
  item_id      TEXT NOT NULL,
  month_year   TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason       TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entry_item ON expense_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_entry_month ON expense_entries(month_year);
`;

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(DDL);
  // Lightweight migration: add months.saved_cents to existing databases.
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(months)');
  if (!cols.some((c) => c.name === 'saved_cents')) {
    await db.execAsync('ALTER TABLE months ADD COLUMN saved_cents INTEGER');
  }
}

// Convenience wrappers so callers don't repeat getDb().
export async function all<T = any>(sql: string, params: SQLite.SQLiteBindParams = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function first<T = any>(sql: string, params: SQLite.SQLiteBindParams = []): Promise<T | null> {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params);
}

export async function run(sql: string, params: SQLite.SQLiteBindParams = []): Promise<void> {
  const db = await getDb();
  await db.runAsync(sql, params);
}

export const bool = (v: number | boolean | null | undefined): boolean => v === 1 || v === true;
export const toInt = (v: boolean): number => (v ? 1 : 0);
