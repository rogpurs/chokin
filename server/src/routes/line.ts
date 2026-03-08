import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { linkLineUser, sendLineTest } from "../services/lineService";

const router = Router();

router.post("/line/link", requireAuth, async (req, res) => {
  const lineUserId = String(req.body?.lineUserId ?? "").trim();
  if (!lineUserId) {
    res.status(400).json({ error: "lineUserId は必須です" });
    return;
  }

  try {
    await linkLineUser(req.userId!, lineUserId);
    res.json({ message: "LINE連携を保存しました" });
  } catch (error) {
    res.status(500).json({ error: "LINE連携保存に失敗" });
  }
});

router.post("/line/test", requireAuth, async (req, res) => {
  try {
    await sendLineTest(req.userId!);
    res.json({ message: "LINEテスト送信しました" });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "LINE送信失敗" });
  }
});

export default router;
