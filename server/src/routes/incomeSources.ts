import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

router.get("/income-sources", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all("SELECT * FROM income_sources WHERE user_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC", [req.userId!]);
    res.json(rows);
  } catch (error) { console.error(error); res.status(500).json({ error: "収入源取得に失敗" }); }
});

router.post("/income-sources", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const kind = String(req.body?.kind ?? "").trim();
  if (!name) { res.status(400).json({ error: "名前は必須です" }); return; }
  if (!["salary", "side_job", "pension", "other"].includes(kind)) { res.status(400).json({ error: "種別が不正です" }); return; }
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const r = await db.run(
      "INSERT INTO income_sources (user_id, name, kind, pay_day, default_amount, account_id, is_primary, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)",
      [req.userId!, name, kind, req.body?.pay_day ?? null, req.body?.default_amount ?? null, req.body?.account_id ?? null, req.body?.is_primary ? 1 : 0, now, now]
    );
    res.status(201).json({ id: r.lastID });
  } catch (error) { console.error(error); res.status(500).json({ error: "収入源作成に失敗" }); }
});

router.put("/income-sources/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const db = getDb();
    const row = await db.get<{ id: number; user_id: number }>("SELECT id, user_id FROM income_sources WHERE id = ?", [id]);
    if (!row || row.user_id !== req.userId!) { res.status(404).json({ error: "見つかりません" }); return; }
    const now = new Date().toISOString();
    const sets: string[] = ["updated_at = ?"];
    const params: (string | number | null)[] = [now];
    if (req.body?.name !== undefined) { sets.push("name = ?"); params.push(String(req.body.name).trim()); }
    if (req.body?.kind !== undefined) { sets.push("kind = ?"); params.push(String(req.body.kind)); }
    if (req.body?.pay_day !== undefined) { sets.push("pay_day = ?"); params.push(req.body.pay_day); }
    if (req.body?.default_amount !== undefined) { sets.push("default_amount = ?"); params.push(req.body.default_amount); }
    if (req.body?.account_id !== undefined) { sets.push("account_id = ?"); params.push(req.body.account_id); }
    if (req.body?.is_primary !== undefined) { sets.push("is_primary = ?"); params.push(req.body.is_primary ? 1 : 0); }
    if (req.body?.is_active !== undefined) { sets.push("is_active = ?"); params.push(req.body.is_active ? 1 : 0); }
    params.push(id);
    await db.run(`UPDATE income_sources SET ${sets.join(", ")} WHERE id = ?`, params);
    res.json({ message: "更新しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "更新に失敗" }); }
});

router.delete("/income-sources/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const db = getDb();
    const row = await db.get<{ id: number; user_id: number }>("SELECT id, user_id FROM income_sources WHERE id = ?", [id]);
    if (!row || row.user_id !== req.userId!) { res.status(404).json({ error: "見つかりません" }); return; }
    await db.run("DELETE FROM income_sources WHERE id = ?", [id]);
    res.json({ message: "削除しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "削除に失敗" }); }
});

export default router;
