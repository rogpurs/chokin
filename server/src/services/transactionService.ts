import type { TransactionType, Account } from "../types";
import { getDb } from "./dbService";

interface TxInput {
  userId: number;
  amount: number;
  type: TransactionType;
  category?: string;
  fromAccountId?: number | null;
  toAccountId?: number | null;
  date: string;
  note?: string;
}

const nowIso = (): string => new Date().toISOString();

export const createTransaction = async (input: TxInput) => {
  const db = getDb();

  return db.transaction(async (tx) => {
    const from = input.fromAccountId
      ? await tx.get<Account>("SELECT * FROM accounts WHERE id = ? AND user_id = ?", [input.fromAccountId, input.userId])
      : undefined;
    const to = input.toAccountId
      ? await tx.get<Account>("SELECT * FROM accounts WHERE id = ? AND user_id = ?", [input.toAccountId, input.userId])
      : undefined;

    if ((input.fromAccountId && !from) || (input.toAccountId && !to)) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if ((input.type === "expense" || input.type === "transfer") && from && from.balance < input.amount) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    const now = nowIso();

    if (input.type === "income" && input.toAccountId) {
      await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [input.amount, now, input.toAccountId]);
    }

    if (input.type === "expense" && input.fromAccountId) {
      await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [input.amount, now, input.fromAccountId]);
    }

    if (input.type === "transfer" && input.fromAccountId && input.toAccountId) {
      await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [input.amount, now, input.fromAccountId]);
      await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [input.amount, now, input.toAccountId]);
    }

    await tx.run(
      `INSERT INTO transactions (user_id, amount, type, category, from_account_id, to_account_id, date, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.userId, input.amount, input.type, input.category ?? null, input.fromAccountId ?? null, input.toAccountId ?? null, input.date, input.note ?? null, now, now]
    );

    const updatedFrom = input.fromAccountId
      ? await tx.get<{ id: number; balance: number }>("SELECT id, balance FROM accounts WHERE id = ?", [input.fromAccountId])
      : null;
    const updatedTo = input.toAccountId
      ? await tx.get<{ id: number; balance: number }>("SELECT id, balance FROM accounts WHERE id = ?", [input.toAccountId])
      : null;

    return { updatedFrom, updatedTo };
  });
};
