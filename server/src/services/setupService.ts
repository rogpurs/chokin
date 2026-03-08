import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import webpush from "web-push";
import { config } from "../config";
import type { SetupState } from "../types";
import { createSqliteAdapter } from "../db/sqliteAdapter";
import { createSchema } from "../db/schema";

export interface SetupPayload {
  appName: string;
  appDescription: string;
  baseUrl: string;
  sqlitePath?: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  salaryDay: number;
  lineChannelAccessToken?: string;
}

const ensureDir = (filePath: string): void => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const readSetupState = (): SetupState | null => {
  if (!fs.existsSync(config.setupPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(config.setupPath, "utf-8")) as SetupState;
};

export const writeSetupState = (state: SetupState): void => {
  ensureDir(config.setupPath);
  fs.writeFileSync(config.setupPath, JSON.stringify(state, null, 2), "utf-8");
};

const nowIso = (): string => new Date().toISOString();

export const runInitialSetup = async (payload: SetupPayload): Promise<void> => {
  if (readSetupState()?.installed) {
    throw new Error("すでにセットアップ済みです");
  }

  const appName = payload.appName.trim();
  const appDescription = payload.appDescription.trim();
  const baseUrl = payload.baseUrl.trim();
  const adminUsername = payload.adminUsername.trim();
  const adminEmail = payload.adminEmail.trim().toLowerCase();
  const adminPassword = payload.adminPassword;
  const salaryDay = Number(payload.salaryDay);

  if (!appName || !baseUrl || !adminUsername || !adminEmail) {
    throw new Error("必須項目が不足しています");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error("管理者メールアドレスが不正です");
  }
  if (adminPassword.length < 10) {
    throw new Error("管理者パスワードは10文字以上にしてください");
  }
  if (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 28) {
    throw new Error("salaryDay は 1-28 の整数にしてください");
  }

  const vapid = webpush.generateVAPIDKeys();
  const jwtSecret = crypto.randomBytes(32).toString("hex");
  const sqlitePath = payload.sqlitePath?.trim() || config.defaultSqlitePath;

  const state: SetupState = {
    installed: true,
    appName,
    appDescription,
    baseUrl,
    db: { sqlitePath },
    jwtSecret,
    vapidPublicKey: vapid.publicKey,
    vapidPrivateKey: vapid.privateKey,
    lineChannelAccessToken: payload.lineChannelAccessToken?.trim() || ""
  };

  const adapter = createSqliteAdapter(sqlitePath);
  try {
    await createSchema(adapter);
    const now = nowIso();
    const hash = await bcrypt.hash(adminPassword, 12);
    const userInsert = await adapter.run(
      `INSERT INTO users (username, email, password_hash, role, salary_day, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminUsername, adminEmail, hash, "admin", salaryDay, now, now]
    );

    if (config.enableSeed) {
      const userId = userInsert.lastID;
      await adapter.run("INSERT INTO accounts (user_id, name, type, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [userId, "現金", "cash", 50000, now, now]);
      await adapter.run("INSERT INTO accounts (user_id, name, type, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [userId, "貯金", "savings", 120000, now, now]);
      await adapter.run("INSERT INTO goals (user_id, name, target_amount, current_savings, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, "旅行", 200000, 50000, "2026-12-31", now, now]);
      await adapter.run("INSERT INTO goals (user_id, name, target_amount, current_savings, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, "ガジェット", 150000, 30000, "2026-10-31", now, now]);
    }

    writeSetupState(state);
  } finally {
    await adapter.close();
  }
};
