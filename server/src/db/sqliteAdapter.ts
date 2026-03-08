import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import type { DatabaseAdapter, DbExecutor, DbRunResult, SqlParam } from "./adapter";

sqlite3.verbose();

export const createSqliteAdapter = (dbPath: string): DatabaseAdapter => {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new sqlite3.Database(dbPath);

  const run = (sql: string, params: SqlParam[] = []): Promise<DbRunResult> =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });

  const get = <T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row as T | undefined);
      });
    });

  const all = <T>(sql: string, params: SqlParam[] = []): Promise<T[]> =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows as T[]);
      });
    });

  return {
    run,
    get,
    all,
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
      await run("BEGIN IMMEDIATE TRANSACTION");
      try {
        const result = await fn({ run, get, all });
        await run("COMMIT");
        return result;
      } catch (error) {
        await run("ROLLBACK");
        throw error;
      }
    },
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        db.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  };
};
