import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

// GET /goals - list goals for user with progressRate
router.get("/goals", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const goals = await db.all<{
      id: number;
      user_id: number;
      name: string;
      target_amount: number;
      current_savings: number;
      deadline: string | null;
      monthly_target_amount: number | null;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>(
      "SELECT * FROM goals WHERE user_id = ? ORDER BY id ASC",
      [req.userId!]
    );

    const goalsWithProgress = goals.map((g) => ({
      ...g,
      progressRate: g.target_amount > 0
        ? Math.min(Math.round((g.current_savings / g.target_amount) * 10000) / 100, 100)
        : 0,
    }));

    res.json(goalsWithProgress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "目標一覧取得に失敗しました" });
  }
});

// POST /goals - create goal
router.post("/goals", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const targetAmount = Number(req.body?.target_amount ?? 0);
  const currentSavings = Number(req.body?.current_savings ?? 0);
  const deadline = req.body?.deadline ? String(req.body.deadline) : null;
  const monthlyTargetAmount = req.body?.monthly_target_amount !== undefined && req.body?.monthly_target_amount !== null
    ? Number(req.body.monthly_target_amount)
    : null;
  const isActive = req.body?.is_active !== undefined ? Number(req.body.is_active) : 1;

  if (!name) {
    res.status(400).json({ error: "name は必須です" });
    return;
  }
  if (!Number.isInteger(targetAmount) || targetAmount <= 0) {
    res.status(400).json({ error: "target_amount は正の整数で指定してください" });
    return;
  }
  if (!Number.isInteger(currentSavings) || currentSavings < 0) {
    res.status(400).json({ error: "current_savings は0以上の整数で指定してください" });
    return;
  }
  if (monthlyTargetAmount !== null && (!Number.isInteger(monthlyTargetAmount) || monthlyTargetAmount < 0)) {
    res.status(400).json({ error: "monthly_target_amount は0以上の整数で指定してください" });
    return;
  }

  try {
    const now = new Date().toISOString();
    const db = getDb();
    const result = await db.run(
      `INSERT INTO goals (user_id, name, target_amount, current_savings, deadline, monthly_target_amount, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId!, name, targetAmount, currentSavings, deadline, monthlyTargetAmount, isActive, now, now]
    );
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "目標作成に失敗しました" });
  }
});

// PUT /goals/:id - update goal
router.put("/goals/:id", requireAuth, async (req, res) => {
  const goalId = Number(req.params.id);
  if (!Number.isInteger(goalId)) {
    res.status(400).json({ error: "目標IDが不正です" });
    return;
  }

  try {
    const db = getDb();
    const existing = await db.get<{ id: number }>(
      "SELECT id FROM goals WHERE id = ? AND user_id = ?",
      [goalId, req.userId!]
    );
    if (!existing) {
      res.status(404).json({ error: "目標が見つかりません" });
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
    if (req.body?.target_amount !== undefined) {
      const v = Number(req.body.target_amount);
      if (!Number.isInteger(v) || v <= 0) {
        res.status(400).json({ error: "target_amount は正の整数で指定してください" });
        return;
      }
      updates.push("target_amount = ?");
      params.push(v);
    }
    if (req.body?.current_savings !== undefined) {
      const v = Number(req.body.current_savings);
      if (!Number.isInteger(v) || v < 0) {
        res.status(400).json({ error: "current_savings は0以上の整数で指定してください" });
        return;
      }
      updates.push("current_savings = ?");
      params.push(v);
    }
    if (req.body?.deadline !== undefined) {
      updates.push("deadline = ?");
      params.push(req.body.deadline ? String(req.body.deadline) : null);
    }
    if (req.body?.monthly_target_amount !== undefined) {
      if (req.body.monthly_target_amount === null) {
        updates.push("monthly_target_amount = ?");
        params.push(null);
      } else {
        const v = Number(req.body.monthly_target_amount);
        if (!Number.isInteger(v) || v < 0) {
          res.status(400).json({ error: "monthly_target_amount は0以上の整数で指定してください" });
          return;
        }
        updates.push("monthly_target_amount = ?");
        params.push(v);
      }
    }
    if (req.body?.is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(Number(req.body.is_active));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "更新する項目がありません" });
      return;
    }

    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    params.push(now);
    params.push(goalId);

    await db.run(`UPDATE goals SET ${updates.join(", ")} WHERE id = ?`, params);
    res.json({ message: "目標を更新しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "目標更新に失敗しました" });
  }
});

// DELETE /goals/:id - delete goal
router.delete("/goals/:id", requireAuth, async (req, res) => {
  const goalId = Number(req.params.id);
  if (!Number.isInteger(goalId)) {
    res.status(400).json({ error: "目標IDが不正です" });
    return;
  }

  try {
    const db = getDb();
    const goal = await db.get<{ id: number }>(
      "SELECT id FROM goals WHERE id = ? AND user_id = ?",
      [goalId, req.userId!]
    );
    if (!goal) {
      res.status(404).json({ error: "目標が見つかりません" });
      return;
    }

    await db.run("DELETE FROM goals WHERE id = ?", [goalId]);
    res.json({ message: "目標を削除しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "目標削除に失敗しました" });
  }
});

// POST /goals/:id/savings - record a saving
router.post("/goals/:id/savings", requireAuth, async (req, res) => {
  const goalId = Number(req.params.id);
  const amount = Number(req.body?.amount ?? 0);
  const recordDate = String(req.body?.record_date ?? new Date().toISOString().slice(0, 10));
  const note = req.body?.note ? String(req.body.note) : null;
  const sourceAccountId = req.body?.source_account_id !== undefined && req.body?.source_account_id !== null
    ? Number(req.body.source_account_id)
    : null;

  if (!Number.isInteger(goalId) || !Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "goalId と amount は正の整数が必要です" });
    return;
  }
  if (sourceAccountId !== null && !Number.isInteger(sourceAccountId)) {
    res.status(400).json({ error: "source_account_id が不正です" });
    return;
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const goal = await tx.get<{ id: number }>(
        "SELECT id FROM goals WHERE id = ? AND user_id = ?",
        [goalId, req.userId!]
      );
      if (!goal) {
        throw new Error("GOAL_NOT_FOUND");
      }

      // Validate source account if provided
      if (sourceAccountId !== null) {
        const account = await tx.get<{ id: number }>(
          "SELECT id FROM accounts WHERE id = ? AND user_id = ?",
          [sourceAccountId, req.userId!]
        );
        if (!account) {
          throw new Error("ACCOUNT_NOT_FOUND");
        }
      }

      const now = new Date().toISOString();
      await tx.run(
        `INSERT INTO saving_records (user_id, goal_id, amount, record_date, note, source_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.userId!, goalId, amount, recordDate, note, sourceAccountId, now, now]
      );
      await tx.run(
        "UPDATE goals SET current_savings = current_savings + ?, updated_at = ? WHERE id = ?",
        [amount, now, goalId]
      );
    });
    res.status(201).json({ message: "積立記録を保存しました" });
  } catch (error) {
    if (error instanceof Error && error.message === "GOAL_NOT_FOUND") {
      res.status(404).json({ error: "目標が見つかりません" });
      return;
    }
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      res.status(404).json({ error: "口座が見つかりません" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "積立記録の保存に失敗しました" });
  }
});

// GET /goals/:id/savings - list saving records for a goal
router.get("/goals/:id/savings", requireAuth, async (req, res) => {
  const goalId = Number(req.params.id);
  if (!Number.isInteger(goalId)) {
    res.status(400).json({ error: "目標IDが不正です" });
    return;
  }

  try {
    const db = getDb();

    // Verify the goal belongs to the user
    const goal = await db.get<{ id: number }>(
      "SELECT id FROM goals WHERE id = ? AND user_id = ?",
      [goalId, req.userId!]
    );
    if (!goal) {
      res.status(404).json({ error: "目標が見つかりません" });
      return;
    }

    const records = await db.all(
      `SELECT sr.id, sr.user_id, sr.goal_id, sr.amount, sr.record_date, sr.note, sr.source_account_id,
              sr.created_at, sr.updated_at,
              a.name AS source_account_name
       FROM saving_records sr
       LEFT JOIN accounts a ON a.id = sr.source_account_id
       WHERE sr.goal_id = ? AND sr.user_id = ?
       ORDER BY sr.record_date DESC, sr.id DESC`,
      [goalId, req.userId!]
    );

    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "積立記録の取得に失敗しました" });
  }
});

export default router;
