import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getPushPublicKey, saveSubscription, sendTestPush } from "../services/pushService";

const router = Router();

router.get("/push/public-key", requireAuth, (_req, res) => {
  try {
    res.json({ publicKey: getPushPublicKey() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "公開鍵取得失敗" });
  }
});

router.post("/push/subscribe", requireAuth, async (req, res) => {
  const endpoint = req.body?.endpoint;
  const p256dh = req.body?.keys?.p256dh;
  const auth = req.body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "subscription が不正です" });
    return;
  }

  try {
    await saveSubscription(req.userId!, req.body);
    res.json({ message: "購読情報を保存しました" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "保存失敗" });
  }
});

router.post("/push/test", requireAuth, async (req, res) => {
  try {
    await sendTestPush(req.userId!);
    res.json({ message: "テスト通知を送信しました" });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "送信失敗" });
  }
});

export default router;
