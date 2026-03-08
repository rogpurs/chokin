import { readSetupState } from "./setupService";
import type { DatabaseAdapter } from "../db/adapter";
import { createSqliteAdapter } from "../db/sqliteAdapter";
import type { SetupState } from "../types";

let adapter: DatabaseAdapter | null = null;
let cacheKey = "";

const buildKey = (state: SetupState): string => state.db.sqlitePath;

export const isInstalled = (): boolean => Boolean(readSetupState()?.installed);
export const getSetup = (): SetupState | null => readSetupState();

export const getDb = (): DatabaseAdapter => {
  const setup = readSetupState();
  if (!setup || !setup.installed) {
    throw new Error("アプリがセットアップされていません");
  }

  const key = buildKey(setup);
  if (adapter && key === cacheKey) {
    return adapter;
  }

  adapter = createSqliteAdapter(setup.db.sqlitePath);
  cacheKey = key;
  return adapter;
};
