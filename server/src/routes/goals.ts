import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

router.get("/goals", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const goals = await db.all("SELECT * FROM goals WHERE user_id = ? ORDER BY id ASC", [req.userId!]);
    res.json(goals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "目標取得に失敗" });
  }
});

router.post("/goals", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const targetAmount = Number(req.body?.target_amount ?? 0);
  const currentSavings = Number(req.body?.current_savings ?? 0);
  const deadline = req.body?.deadline ? String(req.body.deadline) : null;

  if (!name || !Number.isInteger(targetAmount) || targetAmount <= 0 || !Number.isInteger(currentSavings)) {
    res.status(400).json({ error: "入力が不正です" });
    return;
  }

  try {
    const now = new Date().toISOString();
    const db = getDb();
    const result = await db.run(
      `INSERT INTO goals (user_id, name, target_amount, current_savings, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.userId!, name, targetAmount, currentSavings, deadline, now, now]
    );
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "目標作成に失敗" });
  }
});

router.post("/goals/:id/savings", requireAuth, async (req, res) => {
  const goalId = Number(req.params.id);
  const amount = Number(req.body?.amount ?? 0);
  const recordDate = String(req.body?.record_date ?? new Date().toISOString().slice(0, 10));
  const note = req.body?.note ? String(req.body.note) : null;

  if (!Number.isInteger(goalId) || !Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "goalId と amount は正の整数が必要です" });
    return;
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const goal = await tx.get<{ id: number }>("SELECT id FROM goals WHERE id = ? AND user_id = ?", [goalId, req.userId!]);
      if (!goal) {
        throw new Error("GOAL_NOT_FOUND");
      }
      const now = new Date().toISOString();
      await tx.run(
        `INSERT INTO saving_records (user_id, goal_id, amount, record_date, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.userId!, goalId, amount, recordDate, note, now, now]
      );
      await tx.run("UPDATE goals SET current_savings = current_savings + ?, updated_at = ? WHERE id = ?", [amount, now, goalId]);
    });
    res.status(201).json({ message: "積立記録を保存しました" });
  } catch (error) {
    if (error instanceof Error && error.message === "GOAL_NOT_FOUND") {
      res.status(404).json({ error: "目標が見つかりません" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "積立記録の保存に失敗" });
  }
});

export default router;
