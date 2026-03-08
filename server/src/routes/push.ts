import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";
import { getPushPublicKey } from "../services/pushService";
import webpush from "web-push";
import { getSetup } from "../services/dbService";

const router = Router();

// GET /push/public-key
router.get("/push/public-key", requireAuth, (_req, res) => {
  try {
    res.json({ publicKey: getPushPublicKey() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "公開鍵取得に失敗しました" });
  }
});

// POST /push/subscribe - save to push_subscriptions table (upsert by endpoint)
router.post("/push/subscribe", requireAuth, async (req, res) => {
  const endpoint = req.body?.endpoint ? String(req.body.endpoint) : "";
  const p256dh = req.body?.keys?.p256dh ? String(req.body.keys.p256dh) : "";
  const auth = req.body?.keys?.auth ? String(req.body.keys.auth) : "";
  const deviceLabel = req.body?.device_label ? String(req.body.device_label).trim() : null;

  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "subscription が不正です" });
    return;
  }

  try {
    const now = new Date().toISOString();
    const db = getDb();

    // Check if subscription with this endpoint already exists
    const existing = await db.get<{ id: number }>(
      "SELECT id FROM push_subscriptions WHERE endpoint = ? AND user_id = ?",
      [endpoint, req.userId!]
    );

    if (existing) {
      // Update existing subscription
      await db.run(
        `UPDATE push_subscriptions
         SET p256dh = ?, auth = ?, device_label = ?, is_active = 1, updated_at = ?
         WHERE id = ?`,
        [p256dh, auth, deviceLabel, now, existing.id]
      );
    } else {
      // Insert new subscription
      await db.run(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_label, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [req.userId!, endpoint, p256dh, auth, deviceLabel, now, now]
      );
    }

    res.json({ message: "購読情報を保存しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : "購読情報の保存に失敗しました" });
  }
});

// POST /push/test - send test push to ALL active subscriptions for this user
router.post("/push/test", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const setup = getSetup();
    if (!setup) {
      res.status(500).json({ error: "セットアップが完了していません" });
      return;
    }

    webpush.setVapidDetails(`mailto:admin@localhost`, setup.vapidPublicKey, setup.vapidPrivateKey);

    const subscriptions = await db.all<{
      id: number;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>(
      "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND is_active = 1",
      [req.userId!]
    );

    if (subscriptions.length === 0) {
      res.status(400).json({ error: "アクティブな購読がありません" });
      return;
    }

    const payload = JSON.stringify({ title: "CHOKIN", body: "テスト通知です" });
    const now = new Date().toISOString();
    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        await db.run(
          "UPDATE push_subscriptions SET last_success_at = ?, updated_at = ? WHERE id = ?",
          [now, now, sub.id]
        );
        successCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "送信失敗";
        await db.run(
          "UPDATE push_subscriptions SET is_active = 0, last_error_at = ?, last_error_message = ?, updated_at = ? WHERE id = ?",
          [now, errorMessage, now, sub.id]
        );
        failCount++;
      }
    }

    res.json({
      message: "テスト通知を送信しました",
      successCount,
      failCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : "テスト通知の送信に失敗しました" });
  }
});

// GET /push/subscriptions - list active subscriptions for user
router.get("/push/subscriptions", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const subscriptions = await db.all(
      `SELECT id, endpoint, device_label, is_active, last_success_at, last_error_at, last_error_message, created_at, updated_at
       FROM push_subscriptions
       WHERE user_id = ? AND is_active = 1
       ORDER BY id DESC`,
      [req.userId!]
    );
    res.json(subscriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "購読一覧の取得に失敗しました" });
  }
});

// DELETE /push/subscriptions/:id - delete a subscription
router.delete("/push/subscriptions/:id", requireAuth, async (req, res) => {
  const subId = Number(req.params.id);
  if (!Number.isInteger(subId)) {
    res.status(400).json({ error: "購読IDが不正です" });
    return;
  }

  try {
    const db = getDb();
    const existing = await db.get<{ id: number }>(
      "SELECT id FROM push_subscriptions WHERE id = ? AND user_id = ?",
      [subId, req.userId!]
    );
    if (!existing) {
      res.status(404).json({ error: "購読が見つかりません" });
      return;
    }

    await db.run("DELETE FROM push_subscriptions WHERE id = ?", [subId]);
    res.json({ message: "購読を削除しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "購読の削除に失敗しました" });
  }
});

export default router;
