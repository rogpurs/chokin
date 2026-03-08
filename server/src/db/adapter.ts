export type SqlParam = string | number | null;

export interface DbRunResult {
  lastID: number;
  changes: number;
}

export interface DbExecutor {
  run(sql: string, params?: SqlParam[]): Promise<DbRunResult>;
  get<T>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
}

export interface DatabaseAdapter extends DbExecutor {
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
