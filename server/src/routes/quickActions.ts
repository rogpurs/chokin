import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

router.get("/quick-actions", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT qa.*, c.name AS category_name, a.name AS account_name
       FROM quick_actions qa
       LEFT JOIN categories c ON c.id = qa.category_id
       LEFT JOIN accounts a ON a.id = qa.account_id
       WHERE qa.user_id = ? AND qa.is_active = 1 ORDER BY qa.sort_order ASC, qa.id ASC`,
      [req.userId!]
    );
    res.json(rows);
  } catch (error) { console.error(error); res.status(500).json({ error: "取得に失敗" }); }
});

router.post("/quick-actions", requireAuth, async (req, res) => {
  const label = String(req.body?.label ?? "").trim();
  const kind = String(req.body?.kind ?? "").trim();
  if (!label) { res.status(400).json({ error: "ラベルは必須です" }); return; }
  if (!["expense", "income", "saving", "avoid"].includes(kind)) { res.status(400).json({ error: "種別が不正です" }); return; }
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const r = await db.run(
      "INSERT INTO quick_actions (user_id, kind, label, amount, category_id, account_id, sort_order, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)",
      [req.userId!, kind, label, req.body?.amount ?? null, req.body?.category_id ?? null, req.body?.account_id ?? null, Number(req.body?.sort_order ?? 0), now, now]
    );
    res.status(201).json({ id: r.lastID });
  } catch (error) { console.error(error); res.status(500).json({ error: "作成に失敗" }); }
});

router.put("/quick-actions/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const db = getDb();
    const row = await db.get<{ id: number; user_id: number }>("SELECT id, user_id FROM quick_actions WHERE id = ?", [id]);
    if (!row || row.user_id !== req.userId!) { res.status(404).json({ error: "見つかりません" }); return; }
    const now = new Date().toISOString();
    const sets: string[] = ["updated_at = ?"];
    const params: (string | number | null)[] = [now];
    for (const key of ["label", "kind"]) {
      if (req.body?.[key] !== undefined) { sets.push(`${key} = ?`); params.push(String(req.body[key])); }
    }
    for (const key of ["amount", "category_id", "account_id", "sort_order", "is_active"]) {
      if (req.body?.[key] !== undefined) { sets.push(`${key} = ?`); params.push(req.body[key] === null ? null : Number(req.body[key])); }
    }
    params.push(id);
    await db.run(`UPDATE quick_actions SET ${sets.join(", ")} WHERE id = ?`, params);
    res.json({ message: "更新しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "更新に失敗" }); }
});

router.delete("/quick-actions/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const db = getDb();
    const row = await db.get<{ id: number; user_id: number }>("SELECT id, user_id FROM quick_actions WHERE id = ?", [id]);
    if (!row || row.user_id !== req.userId!) { res.status(404).json({ error: "見つかりません" }); return; }
    await db.run("DELETE FROM quick_actions WHERE id = ?", [id]);
    res.json({ message: "削除しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "削除に失敗" }); }
});

export default router;
