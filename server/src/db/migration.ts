import type { DbExecutor } from "./adapter";

const columnExists = async (db: DbExecutor, table: string, column: string): Promise<boolean> => {
  const rows = await db.all<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === column);
};

const tableExists = async (db: DbExecutor, table: string): Promise<boolean> => {
  const row = await db.get<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [table]
  );
  return Boolean(row);
};

const addColumnIfMissing = async (
  db: DbExecutor,
  table: string,
  column: string,
  definition: string
): Promise<void> => {
  if (!(await columnExists(db, table, column))) {
    await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

export const runMigrations = async (db: DbExecutor): Promise<void> => {
  // ── users table additions ──
  await addColumnIfMissing(db, "users", "onboarding_completed_at", "TEXT");
  await addColumnIfMissing(db, "users", "budgeting_anchor_type", "TEXT DEFAULT 'salary_day'");
  await addColumnIfMissing(db, "users", "budgeting_anchor_day", "INTEGER");
  await addColumnIfMissing(db, "users", "period_start_rule", "TEXT DEFAULT 'day_before'");
  await addColumnIfMissing(db, "users", "display_name", "TEXT");
  await addColumnIfMissing(db, "users", "theme", "TEXT DEFAULT 'system'");
  await addColumnIfMissing(db, "users", "reduce_motion", "INTEGER DEFAULT 0");
  await addColumnIfMissing(db, "users", "notification_level", "TEXT DEFAULT 'normal'");

  // ── accounts table additions ──
  await addColumnIfMissing(db, "accounts", "initial_balance", "INTEGER DEFAULT 0");
  await addColumnIfMissing(db, "accounts", "is_active", "INTEGER DEFAULT 1");
  await addColumnIfMissing(db, "accounts", "sort_order", "INTEGER DEFAULT 0");
  await addColumnIfMissing(db, "accounts", "include_in_total_assets", "INTEGER DEFAULT 1");
  await addColumnIfMissing(db, "accounts", "note", "TEXT");

  // ── goals table additions ──
  await addColumnIfMissing(db, "goals", "monthly_target_amount", "INTEGER");
  await addColumnIfMissing(db, "goals", "is_active", "INTEGER DEFAULT 1");

  // ── transactions table additions ──
  await addColumnIfMissing(db, "transactions", "category_id", "INTEGER");
  await addColumnIfMissing(db, "transactions", "deleted_at", "TEXT");
  await addColumnIfMissing(db, "transactions", "quick_action_id", "INTEGER");

  // ── saving_records table additions ──
  await addColumnIfMissing(db, "saving_records", "source_account_id", "INTEGER");

  // ── periods table additions ──
  await addColumnIfMissing(db, "periods", "closed_at", "TEXT");

  // ── New table: categories ──
  if (!(await tableExists(db, "categories"))) {
    await db.run(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    // Seed default categories
    const now = new Date().toISOString();
    const defaults: [string, string][] = [
      ["expense", "食費"],
      ["expense", "日用品"],
      ["expense", "交通費"],
      ["expense", "住居費"],
      ["expense", "光熱費"],
      ["expense", "通信費"],
      ["expense", "趣味・娯楽"],
      ["expense", "衣服"],
      ["expense", "医療・健康"],
      ["expense", "教育"],
      ["expense", "交際費"],
      ["expense", "その他"],
      ["income", "給与"],
      ["income", "副業"],
      ["income", "投資"],
      ["income", "その他"],
      ["saving", "貯金"],
      ["saving", "投資積立"],
      ["saving", "緊急資金"],
    ];
    for (let i = 0; i < defaults.length; i++) {
      const [kind, name] = defaults[i];
      await db.run(
        `INSERT INTO categories (user_id, kind, name, sort_order, is_default, is_active, created_at, updated_at)
         VALUES (NULL, ?, ?, ?, 1, 1, ?, ?)`,
        [kind, name, i, now, now]
      );
    }
  }

  // ── New table: income_sources ──
  if (!(await tableExists(db, "income_sources"))) {
    await db.run(`
      CREATE TABLE income_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        pay_day INTEGER,
        default_amount INTEGER,
        account_id INTEGER,
        is_primary INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  // ── New table: push_subscriptions ──
  if (!(await tableExists(db, "push_subscriptions"))) {
    await db.run(`
      CREATE TABLE push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        device_label TEXT,
        is_active INTEGER DEFAULT 1,
        last_success_at TEXT,
        last_error_at TEXT,
        last_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    // Migrate existing push data from users table
    const usersWithPush = await db.all<{
      id: number;
      push_endpoint: string | null;
      push_p256dh: string | null;
      push_auth: string | null;
    }>("SELECT id, push_endpoint, push_p256dh, push_auth FROM users WHERE push_endpoint IS NOT NULL");
    const now = new Date().toISOString();
    for (const u of usersWithPush) {
      if (u.push_endpoint && u.push_p256dh && u.push_auth) {
        await db.run(
          `INSERT OR IGNORE INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_label, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [u.id, u.push_endpoint, u.push_p256dh, u.push_auth, "Migrated", now, now]
        );
      }
    }
  }

  // ── New table: quick_actions ──
  if (!(await tableExists(db, "quick_actions"))) {
    await db.run(`
      CREATE TABLE quick_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        amount INTEGER,
        category_id INTEGER,
        account_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  // ── Indexes ──
  const indexes: [string, string, string][] = [
    ["idx_transactions_user_date", "transactions", "user_id, date"],
    ["idx_transactions_user_type", "transactions", "user_id, type"],
    ["idx_transactions_category_id", "transactions", "category_id"],
    ["idx_transactions_deleted", "transactions", "deleted_at"],
    ["idx_accounts_user", "accounts", "user_id"],
    ["idx_goals_user", "goals", "user_id"],
    ["idx_saving_records_user", "saving_records", "user_id"],
    ["idx_saving_records_goal", "saving_records", "goal_id"],
    ["idx_periods_user", "periods", "user_id"],
    ["idx_monthly_reports_user", "monthly_reports", "user_id"],
    ["idx_categories_user_kind", "categories", "user_id, kind"],
    ["idx_income_sources_user", "income_sources", "user_id"],
    ["idx_push_subs_user", "push_subscriptions", "user_id"],
    ["idx_quick_actions_user", "quick_actions", "user_id"],
  ];
  for (const [name, table, cols] of indexes) {
    await db.run(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${cols})`);
  }

  // Enable foreign keys
  await db.run("PRAGMA foreign_keys = ON");
};
