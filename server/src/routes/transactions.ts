import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";
import type { TransactionType } from "../types";

const router = Router();
const allowedTypes: TransactionType[] = ["income", "expense", "transfer", "avoid"];

const normalizeId = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

// GET /transactions - list with pagination and filters
router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const db = getDb();

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["t.user_id = ?", "t.deleted_at IS NULL"];
    const params: (string | number | null)[] = [req.userId!];

    if (req.query.type) {
      conditions.push("t.type = ?");
      params.push(String(req.query.type));
    }
    if (req.query.category_id) {
      conditions.push("t.category_id = ?");
      params.push(Number(req.query.category_id));
    }
    if (req.query.account_id) {
      const accountId = Number(req.query.account_id);
      conditions.push("(t.from_account_id = ? OR t.to_account_id = ?)");
      params.push(accountId, accountId);
    }
    if (req.query.date_from) {
      conditions.push("t.date >= ?");
      params.push(String(req.query.date_from));
    }
    if (req.query.date_to) {
      conditions.push("t.date <= ?");
      params.push(String(req.query.date_to));
    }

    const whereClause = conditions.join(" AND ");

    // Determine sort order
    let orderClause = "t.date DESC, t.id DESC";
    const sort = String(req.query.sort ?? "date_desc");
    switch (sort) {
      case "date_asc":
        orderClause = "t.date ASC, t.id ASC";
        break;
      case "amount_desc":
        orderClause = "t.amount DESC, t.id DESC";
        break;
      case "amount_asc":
        orderClause = "t.amount ASC, t.id ASC";
        break;
      case "date_desc":
      default:
        orderClause = "t.date DESC, t.id DESC";
        break;
    }

    // Count total
    const countResult = await db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM transactions t WHERE ${whereClause}`,
      params
    );
    const total = countResult?.cnt ?? 0;

    // Fetch items
    const items = await db.all(
      `SELECT t.id, t.user_id, t.amount, t.type, t.category, t.category_id, t.from_account_id, t.to_account_id,
              t.date, t.note, t.deleted_at, t.quick_action_id, t.created_at, t.updated_at,
              c.name AS category_name,
              fa.name AS from_account_name,
              ta.name AS to_account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts fa ON fa.id = t.from_account_id
       LEFT JOIN accounts ta ON ta.id = t.to_account_id
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ items, total, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "取引一覧取得に失敗しました" });
  }
});

// POST /transactions - create transaction
router.post("/transactions", requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount);
  const type = req.body?.type as TransactionType;
  const category = req.body?.category ? String(req.body.category).trim() : undefined;
  const categoryId = normalizeId(req.body?.category_id);
  const fromAccountId = normalizeId(req.body?.from_account_id);
  const toAccountId = normalizeId(req.body?.to_account_id);
  const date = String(req.body?.date ?? "");
  const note = req.body?.note ? String(req.body.note).trim() : undefined;

  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "amount は正の整数のみ" });
    return;
  }
  if (!allowedTypes.includes(type)) {
    res.status(400).json({ error: "type は income/expense/transfer/avoid のみ" });
    return;
  }
  if (!date || Number.isNaN(new Date(date).getTime())) {
    res.status(400).json({ error: "date が不正です" });
    return;
  }

  // "avoid" type does not require account ids and does not change balances
  if (type !== "avoid") {
    if (type === "income" && !toAccountId) {
      res.status(400).json({ error: "income には to_account_id が必須" });
      return;
    }
    if (type === "expense" && !fromAccountId) {
      res.status(400).json({ error: "expense には from_account_id が必須" });
      return;
    }
    if (type === "transfer" && (!fromAccountId || !toAccountId || fromAccountId === toAccountId)) {
      res.status(400).json({ error: "transfer の口座指定が不正です" });
      return;
    }
  }

  try {
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      // Validate accounts
      const from = fromAccountId
        ? await tx.get<{ id: number; balance: number; user_id: number }>(
            "SELECT id, balance, user_id FROM accounts WHERE id = ? AND user_id = ?",
            [fromAccountId, req.userId!]
          )
        : undefined;
      const to = toAccountId
        ? await tx.get<{ id: number; balance: number; user_id: number }>(
            "SELECT id, balance, user_id FROM accounts WHERE id = ? AND user_id = ?",
            [toAccountId, req.userId!]
          )
        : undefined;

      if ((fromAccountId && !from) || (toAccountId && !to)) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const now = new Date().toISOString();

      // Apply balance changes (skip for "avoid" type)
      if (type !== "avoid") {
        if ((type === "expense" || type === "transfer") && from && from.balance < amount) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        if (type === "income" && toAccountId) {
          await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [amount, now, toAccountId]);
        }
        if (type === "expense" && fromAccountId) {
          await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [amount, now, fromAccountId]);
        }
        if (type === "transfer" && fromAccountId && toAccountId) {
          await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [amount, now, fromAccountId]);
          await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [amount, now, toAccountId]);
        }
      }

      // Insert transaction
      const insertResult = await tx.run(
        `INSERT INTO transactions (user_id, amount, type, category, category_id, from_account_id, to_account_id, date, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.userId!, amount, type, category ?? null, categoryId, fromAccountId, toAccountId, date, note ?? null, now, now]
      );

      const updatedFrom = fromAccountId
        ? await tx.get<{ id: number; balance: number }>("SELECT id, balance FROM accounts WHERE id = ?", [fromAccountId])
        : null;
      const updatedTo = toAccountId
        ? await tx.get<{ id: number; balance: number }>("SELECT id, balance FROM accounts WHERE id = ?", [toAccountId])
        : null;

      return { id: insertResult.lastID, updatedFrom, updatedTo };
    });

    res.status(201).json({
      message: "取引を登録しました",
      id: result.id,
      updatedBalances: { from: result.updatedFrom, to: result.updatedTo },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      res.status(404).json({ error: "口座が見つかりません" });
      return;
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      res.status(400).json({ error: "残高不足です" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "取引登録に失敗しました" });
  }
});

// PUT /transactions/:id - update transaction (reverse old, apply new)
router.put("/transactions/:id", requireAuth, async (req, res) => {
  const txId = Number(req.params.id);
  if (!Number.isInteger(txId)) {
    res.status(400).json({ error: "取引IDが不正です" });
    return;
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      // Fetch original transaction
      const original = await tx.get<{
        id: number;
        user_id: number;
        amount: number;
        type: TransactionType;
        category: string | null;
        category_id: number | null;
        from_account_id: number | null;
        to_account_id: number | null;
        date: string;
        note: string | null;
        deleted_at: string | null;
      }>(
        "SELECT * FROM transactions WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
        [txId, req.userId!]
      );
      if (!original) {
        throw new Error("TX_NOT_FOUND");
      }

      const now = new Date().toISOString();

      // --- Reverse old balance changes (skip for "avoid" type) ---
      if (original.type !== "avoid") {
        if (original.type === "income" && original.to_account_id) {
          await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [original.amount, now, original.to_account_id]);
        }
        if (original.type === "expense" && original.from_account_id) {
          await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [original.amount, now, original.from_account_id]);
        }
        if (original.type === "transfer") {
          if (original.from_account_id) {
            await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [original.amount, now, original.from_account_id]);
          }
          if (original.to_account_id) {
            await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [original.amount, now, original.to_account_id]);
          }
        }
      }

      // --- Determine new values ---
      const newAmount = req.body?.amount !== undefined ? Number(req.body.amount) : original.amount;
      const newType = req.body?.type !== undefined ? (req.body.type as TransactionType) : original.type;
      const newCategory = req.body?.category !== undefined
        ? (req.body.category ? String(req.body.category).trim() : null)
        : original.category;
      const newCategoryId = req.body?.category_id !== undefined ? normalizeId(req.body.category_id) : original.category_id;
      const newFromAccountId = req.body?.from_account_id !== undefined ? normalizeId(req.body.from_account_id) : original.from_account_id;
      const newToAccountId = req.body?.to_account_id !== undefined ? normalizeId(req.body.to_account_id) : original.to_account_id;
      const newDate = req.body?.date !== undefined ? String(req.body.date) : original.date;
      const newNote = req.body?.note !== undefined
        ? (req.body.note ? String(req.body.note).trim() : null)
        : original.note;

      if (!Number.isInteger(newAmount) || newAmount <= 0) {
        throw new Error("INVALID_AMOUNT");
      }
      if (!allowedTypes.includes(newType)) {
        throw new Error("INVALID_TYPE");
      }

      // --- Apply new balance changes (skip for "avoid" type) ---
      if (newType !== "avoid") {
        // Validate new accounts
        if (newFromAccountId) {
          const fromAcc = await tx.get<{ id: number; balance: number }>(
            "SELECT id, balance FROM accounts WHERE id = ? AND user_id = ?",
            [newFromAccountId, req.userId!]
          );
          if (!fromAcc) throw new Error("ACCOUNT_NOT_FOUND");
          if ((newType === "expense" || newType === "transfer") && fromAcc.balance < newAmount) {
            throw new Error("INSUFFICIENT_FUNDS");
          }
        }
        if (newToAccountId) {
          const toAcc = await tx.get<{ id: number }>(
            "SELECT id FROM accounts WHERE id = ? AND user_id = ?",
            [newToAccountId, req.userId!]
          );
          if (!toAcc) throw new Error("ACCOUNT_NOT_FOUND");
        }

        if (newType === "income" && newToAccountId) {
          await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [newAmount, now, newToAccountId]);
        }
        if (newType === "expense" && newFromAccountId) {
          await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [newAmount, now, newFromAccountId]);
        }
        if (newType === "transfer" && newFromAccountId && newToAccountId) {
          await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [newAmount, now, newFromAccountId]);
          await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [newAmount, now, newToAccountId]);
        }
      }

      // --- Update the transaction record ---
      await tx.run(
        `UPDATE transactions
         SET amount = ?, type = ?, category = ?, category_id = ?, from_account_id = ?, to_account_id = ?, date = ?, note = ?, updated_at = ?
         WHERE id = ?`,
        [newAmount, newType, newCategory, newCategoryId, newFromAccountId, newToAccountId, newDate, newNote, now, txId]
      );
    });

    res.json({ message: "取引を更新しました" });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "TX_NOT_FOUND":
          res.status(404).json({ error: "取引が見つかりません" });
          return;
        case "ACCOUNT_NOT_FOUND":
          res.status(404).json({ error: "口座が見つかりません" });
          return;
        case "INSUFFICIENT_FUNDS":
          res.status(400).json({ error: "残高不足です" });
          return;
        case "INVALID_AMOUNT":
          res.status(400).json({ error: "amount は正の整数のみ" });
          return;
        case "INVALID_TYPE":
          res.status(400).json({ error: "type は income/expense/transfer/avoid のみ" });
          return;
      }
    }
    console.error(error);
    res.status(500).json({ error: "取引更新に失敗しました" });
  }
});

// DELETE /transactions/:id - soft delete (set deleted_at, reverse balances)
router.delete("/transactions/:id", requireAuth, async (req, res) => {
  const txId = Number(req.params.id);
  if (!Number.isInteger(txId)) {
    res.status(400).json({ error: "取引IDが不正です" });
    return;
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const original = await tx.get<{
        id: number;
        user_id: number;
        amount: number;
        type: TransactionType;
        from_account_id: number | null;
        to_account_id: number | null;
        deleted_at: string | null;
      }>(
        "SELECT id, user_id, amount, type, from_account_id, to_account_id, deleted_at FROM transactions WHERE id = ? AND user_id = ?",
        [txId, req.userId!]
      );
      if (!original) {
        throw new Error("TX_NOT_FOUND");
      }
      if (original.deleted_at) {
        throw new Error("ALREADY_DELETED");
      }

      const now = new Date().toISOString();

      // Reverse balance changes (skip for "avoid" type)
      if (original.type !== "avoid") {
        if (original.type === "income" && original.to_account_id) {
          await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [original.amount, now, original.to_account_id]);
        }
        if (original.type === "expense" && original.from_account_id) {
          await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [original.amount, now, original.from_account_id]);
        }
        if (original.type === "transfer") {
          if (original.from_account_id) {
            await tx.run("UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", [original.amount, now, original.from_account_id]);
          }
          if (original.to_account_id) {
            await tx.run("UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", [original.amount, now, original.to_account_id]);
          }
        }
      }

      // Soft delete
      await tx.run("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, txId]);
    });

    res.json({ message: "取引を削除しました" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TX_NOT_FOUND") {
        res.status(404).json({ error: "取引が見つかりません" });
        return;
      }
      if (error.message === "ALREADY_DELETED") {
        res.status(400).json({ error: "この取引は既に削除されています" });
        return;
      }
    }
    console.error(error);
    res.status(500).json({ error: "取引削除に失敗しました" });
  }
});

export default router;
