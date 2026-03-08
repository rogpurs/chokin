import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

router.get("/accounts", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all("SELECT * FROM accounts WHERE user_id = ? ORDER BY id ASC", [req.userId!]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "口座一覧取得に失敗" });
  }
});

router.post("/accounts", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const type = String(req.body?.type ?? "").trim();
  const balance = Number(req.body?.balance ?? 0);

  if (!name || !type || !Number.isInteger(balance)) {
    res.status(400).json({ error: "name/type/balance が不正です" });
    return;
  }

  try {
    const now = new Date().toISOString();
    const db = getDb();
    const result = await db.run(
      "INSERT INTO accounts (user_id, name, type, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [req.userId!, name, type, balance, now, now]
    );
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "口座作成に失敗" });
  }
});

export default router;
