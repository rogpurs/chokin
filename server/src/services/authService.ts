import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb, getSetup } from "./dbService";
import type { User } from "../types";

const nowIso = (): string => new Date().toISOString();

export const registerUser = async (username: string, email: string, password: string, salaryDay: number): Promise<void> => {
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const cleanName = username.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("メールアドレスが不正です");
  }
  if (cleanName.length < 2 || cleanName.length > 40) {
    throw new Error("ユーザー名は2-40文字で入力してください");
  }
  if (password.length < 10) {
    throw new Error("パスワードは10文字以上にしてください");
  }
  if (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 28) {
    throw new Error("salaryDay は1-28で指定してください");
  }

  const existing = await db.get<{ id: number }>("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
  if (existing) {
    throw new Error("このメールアドレスは既に使われています");
  }

  const hash = await bcrypt.hash(password, 12);
  const now = nowIso();
  await db.run(
    `INSERT INTO users (username, email, password_hash, role, salary_day, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cleanName, normalizedEmail, hash, "user", salaryDay, now, now]
  );
};

export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  const db = getDb();
  const setup = getSetup();
  if (!setup) {
    throw new Error("セットアップ未完了です");
  }

  const row = await db.get<(User & { password_hash: string })>(
    `SELECT id, username, email, salary_day, line_user_id, push_endpoint, push_p256dh, push_auth, password_hash
     FROM users WHERE email = ?`,
    [email.toLowerCase().trim()]
  );

  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw new Error("メールアドレスまたはパスワードが不正です");
  }

  const token = jwt.sign({ userId: row.id }, setup.jwtSecret, {
    expiresIn: "12h",
    issuer: "chokin-app",
    audience: "chokin-client"
  });

  const { password_hash: _unused, ...user } = row;
  return { token, user };
};

export const verifyToken = (token: string): { userId: number } => {
  const setup = getSetup();
  if (!setup) {
    throw new Error("セットアップ未完了です");
  }
  return jwt.verify(token, setup.jwtSecret, {
    issuer: "chokin-app",
    audience: "chokin-client"
  }) as { userId: number };
};
