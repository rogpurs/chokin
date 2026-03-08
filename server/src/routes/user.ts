import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

router.get("/user/profile", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get(
      `SELECT id, username, email, display_name, salary_day, budgeting_anchor_type,
        budgeting_anchor_day, period_start_rule, theme, reduce_motion, notification_level,
        onboarding_completed_at, line_user_id FROM users WHERE id = ?`,
      [req.userId!]
    );
    if (!user) { res.status(404).json({ error: "ユーザーが見つかりません" }); return; }
    res.json(user);
  } catch (error) { console.error(error); res.status(500).json({ error: "プロフィール取得に失敗" }); }
});

router.put("/user/profile", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ["updated_at = ?"];
    const params: (string | number | null)[] = [now];

    const fields: Record<string, "string" | "number"> = {
      display_name: "string", salary_day: "number", budgeting_anchor_type: "string",
      budgeting_anchor_day: "number", period_start_rule: "string", theme: "string",
      reduce_motion: "number", notification_level: "string"
    };
    for (const [key, type] of Object.entries(fields)) {
      if (req.body?.[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(type === "number" ? Number(req.body[key]) : String(req.body[key]));
      }
    }
    if (req.body?.salary_day !== undefined) {
      const sd = Number(req.body.salary_day);
      if (!Number.isInteger(sd) || sd < 1 || sd > 28) { res.status(400).json({ error: "給料日は1-28の整数で指定してください" }); return; }
    }
    params.push(req.userId!);
    await db.run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
    res.json({ message: "プロフィールを更新しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "更新に失敗" }); }
});

router.put("/user/password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.current_password ?? "");
  const newPassword = String(req.body?.new_password ?? "");
  if (newPassword.length < 10) { res.status(400).json({ error: "新しいパスワードは10文字以上にしてください" }); return; }
  try {
    const db = getDb();
    const user = await db.get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [req.userId!]);
    if (!user) { res.status(404).json({ error: "ユーザーが見つかりません" }); return; }
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) { res.status(400).json({ error: "現在のパスワードが正しくありません" }); return; }
    const hash = await bcrypt.hash(newPassword, 12);
    const now = new Date().toISOString();
    await db.run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [hash, now, req.userId!]);
    res.json({ message: "パスワードを変更しました" });
  } catch (error) { console.error(error); res.status(500).json({ error: "パスワード変更に失敗" }); }
});

export default router;
