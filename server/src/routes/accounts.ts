import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

// GET /accounts - list accounts for user
router.get("/accounts", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT id, user_id, name, type, balance, initial_balance, is_active, sort_order, include_in_total_assets, note, created_at, updated_at
       FROM accounts
       WHERE user_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [req.userId!]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "口座一覧取得に失敗しました" });
  }
});

// POST /accounts - create account
router.post("/accounts", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const type = String(req.body?.type ?? "").trim();
  const balance = Number(req.body?.balance ?? 0);
  const initialBalance = Number(req.body?.initial_balance ?? balance);
  const isActive = req.body?.is_active !== undefined ? Number(req.body.is_active) : 1;
  const sortOrder = Number(req.body?.sort_order ?? 0);
  const includeInTotalAssets = req.body?.include_in_total_assets !== undefined ? Number(req.body.include_in_total_assets) : 1;
  const note = req.body?.note ? String(req.body.note).trim() : null;

  if (!name || !type) {
    res.status(400).json({ error: "name と type は必須です" });
    return;
  }
  if (!Number.isInteger(balance)) {
    res.status(400).json({ error: "balance は整数で指定してください" });
    return;
  }
  if (!Number.isInteger(initialBalance)) {
    res.status(400).json({ error: "initial_balance は整数で指定してください" });
    return;
  }

  try {
    const now = new Date().toISOString();
    const db = getDb();
    const result = await db.run(
      `INSERT INTO accounts (user_id, name, type, balance, initial_balance, is_active, sort_order, include_in_total_assets, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId!, name, type, balance, initialBalance, isActive, sortOrder, includeInTotalAssets, note, now, now]
    );
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "口座作成に失敗しました" });
  }
});

// PUT /accounts/:id - update account (balance change NOT allowed)
router.put("/accounts/:id", requireAuth, async (req, res) => {
  const accountId = Number(req.params.id);
  if (!Number.isInteger(accountId)) {
    res.status(400).json({ error: "口座IDが不正です" });
    return;
  }

  try {
    const db = getDb();
    const existing = await db.get<{ id: number; user_id: number }>(
      "SELECT id, user_id FROM accounts WHERE id = ? AND user_id = ?",
      [accountId, req.userId!]
    );
    if (!existing) {
      res.status(404).json({ error: "口座が見つかりません" });
      return;
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) {
        res.status(400).json({ error: "name は空にできません" });
        return;
      }
      updates.push("name = ?");
      params.push(name);
    }
    if (req.body?.type !== undefined) {
      const type = String(req.body.type).trim();
      if (!type) {
        res.status(400).json({ error: "type は空にできません" });
        return;
      }
      updates.push("type = ?");
      params.push(type);
    }
    if (req.body?.is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(Number(req.body.is_active));
    }
    if (req.body?.sort_order !== undefined) {
      updates.push("sort_order = ?");
      params.push(Number(req.body.sort_order));
    }
    if (req.body?.include_in_total_assets !== undefined) {
      updates.push("include_in_total_assets = ?");
      params.push(Number(req.body.include_in_total_assets));
    }
    if (req.body?.note !== undefined) {
      updates.push("note = ?");
      params.push(req.body.note ? String(req.body.note).trim() : null);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "更新する項目がありません" });
      return;
    }

    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    params.push(now);
    params.push(accountId);

    await db.run(`UPDATE accounts SET ${updates.join(", ")} WHERE id = ?`, params);
    res.json({ message: "口座を更新しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "口座更新に失敗しました" });
  }
});

// DELETE /accounts/:id - delete or deactivate account
router.delete("/accounts/:id", requireAuth, async (req, res) => {
  const accountId = Number(req.params.id);
  if (!Number.isInteger(accountId)) {
    res.status(400).json({ error: "口座IDが不正です" });
    return;
  }

  try {
    const db = getDb();
    const account = await db.get<{ id: number; user_id: number; balance: number }>(
      "SELECT id, user_id, balance FROM accounts WHERE id = ? AND user_id = ?",
      [accountId, req.userId!]
    );
    if (!account) {
      res.status(404).json({ error: "口座が見つかりません" });
      return;
    }

    if (account.balance === 0) {
      await db.run("DELETE FROM accounts WHERE id = ?", [accountId]);
      res.json({ message: "口座を削除しました", deleted: true });
    } else {
      const now = new Date().toISOString();
      await db.run("UPDATE accounts SET is_active = 0, updated_at = ? WHERE id = ?", [now, accountId]);
      res.json({ message: "残高があるため口座を無効化しました", deleted: false, deactivated: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "口座削除に失敗しました" });
  }
});

export default router;
