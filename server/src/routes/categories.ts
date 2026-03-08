import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

router.get("/categories", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      "SELECT * FROM categories WHERE (user_id IS NULL OR user_id = ?) AND is_active = 1 ORDER BY kind, sort_order ASC, id ASC",
      [req.userId!]
    );
    res.json(rows);
  } catch (error) { console.error(error); res.status(500).json({ error: "カテゴリ取得に失敗" }); }
});

router.post("/categories", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const kind = String(req.body?.kind ?? "").trim();
  if (!name) { res.status(400).json({ error: "名前は必須です" }); return; }
  if (!["income", "expense", "saving", "other"].includes(kind)) { res.status(400).json({ error: "種別が不正です" }); return; }
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const r = await db.run(
      "INSERT INTO categories (user_id, kind, name, icon, color, sort_order, is_default, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,0,1,?,?)",
      [req.userId!, kind, name, req.body?.icon ?? null, req.body?.color ?? null, Number(req.body?.sort_order ?? 0), now, now]
    );
    res.status(201).json({ id: r.lastID });
  } catch (error) { console.error(error); res.status(500).json({ error: "カテゴリ作成に失敗" }); }
});

router.put("/categories/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const db = getDb();
    const cat = await db.get<{ id: number; user_id: number | null }>("SELECT id, user_id FROM categories WHERE id = ?", [id]);
    if (!cat) { res.status(404).json({ error: "見つかりません" }); return; }
    if (cat.user_id !== null && cat.user_id !== req.userId!) { res.status(403).json({ error: "権限がありません" }); return; }
    const now = new Date().toISOString();
    const sets: string[] = ["updated_at = ?"];
    const params: (string | number | null)[] = [now];
    if (req.body?.name !== undefined) { sets.push("name = ?"); params.push(String(req.body.name).trim()); }
    if (req.body?.icon !== undefined) { sets.push("icon = ?"); params.push(req.body.icon); }
    if (req.body?.color !== undefined) { sets.push("color = ?"); params.push(req.body.color); }
    if (req.body?.sort_order !== undefined) { sets.push("sort_order = ?"); params.push(Number(req.body.sort_order)); }
    if (req.body?.is_active !== undefined) { sets.push("is_active = ?"); params.push(Number(req.body.is_active)); }
    params.push(id);
    await db.run(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, params);
    res.json({ message: "更新しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "更新に失敗" }); }
});

router.delete("/categories/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const db = getDb();
    const cat = await db.get<{ id: number; user_id: number | null; is_default: number }>("SELECT id, user_id, is_default FROM categories WHERE id = ?", [id]);
    if (!cat) { res.status(404).json({ error: "見つかりません" }); return; }
    if (cat.is_default === 1) { res.status(400).json({ error: "デフォルトカテゴリは削除できません" }); return; }
    if (cat.user_id !== req.userId!) { res.status(403).json({ error: "権限がありません" }); return; }
    await db.run("DELETE FROM categories WHERE id = ?", [id]);
    res.json({ message: "削除しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "削除に失敗" }); }
});

export default router;
