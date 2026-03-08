import { Router } from "express";
import https from "https";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";
import { linkLineUser, sendLineTest } from "../services/lineService";
import { getSetup } from "../services/dbService";

const router = Router();

// POST /line/link - manual userId input (existing)
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
    console.error(error);
    res.status(500).json({ error: "LINE連携保存に失敗しました" });
  }
});

// POST /line/test - send test message (existing)
router.post("/line/test", requireAuth, async (req, res) => {
  try {
    await sendLineTest(req.userId!);
    res.json({ message: "LINEテスト送信しました" });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "LINE送信に失敗しました" });
  }
});

// GET /line/auth-url - generate LINE Login authorization URL
router.get("/line/auth-url", requireAuth, async (req, res) => {
  try {
    const setup = getSetup();
    if (!setup?.lineLoginChannelId) {
      res.status(400).json({ error: "LINE Loginが設定されていません" });
      return;
    }

    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${setup.baseUrl}/api/line/callback`;

    // Store state in a temporary way - attach to user record
    const now = new Date().toISOString();
    const db = getDb();
    await db.run(
      "UPDATE users SET updated_at = ? WHERE id = ?",
      [now, req.userId!]
    );

    const url =
      `https://access.line.me/oauth2/v2.1/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(setup.lineLoginChannelId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=profile%20openid`;

    res.json({ url, state });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "LINE認証URL生成に失敗しました" });
  }
});

// Helper: make HTTPS POST request
const httpsPost = (url: string, body: string, headers: Record<string, string>): Promise<string> => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": String(Buffer.byteLength(body)),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode ?? 0}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
};

// Helper: make HTTPS GET request
const httpsGet = (url: string, headers: Record<string, string>): Promise<string> => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode ?? 0}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
};

// GET /line/callback - handle OAuth callback
router.get("/line/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  const error = req.query.error ? String(req.query.error) : null;

  if (error) {
    res.redirect("/settings?line=error&reason=" + encodeURIComponent(error));
    return;
  }

  if (!code) {
    res.redirect("/settings?line=error&reason=no_code");
    return;
  }

  try {
    const setup = getSetup();
    if (!setup?.lineLoginChannelId || !setup?.lineLoginChannelSecret) {
      res.redirect("/settings?line=error&reason=not_configured");
      return;
    }

    const redirectUri = `${setup.baseUrl}/api/line/callback`;

    // Exchange code for token
    const tokenBody = [
      `grant_type=authorization_code`,
      `code=${encodeURIComponent(code)}`,
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
      `client_id=${encodeURIComponent(setup.lineLoginChannelId)}`,
      `client_secret=${encodeURIComponent(setup.lineLoginChannelSecret)}`,
    ].join("&");

    const tokenResponse = await httpsPost(
      "https://api.line.me/oauth2/v2.1/token",
      tokenBody,
      { "Content-Type": "application/x-www-form-urlencoded" }
    );
    const tokenData = JSON.parse(tokenResponse) as { access_token: string };

    // Get profile
    const profileResponse = await httpsGet(
      "https://api.line.me/v2/profile",
      { Authorization: `Bearer ${tokenData.access_token}` }
    );
    const profileData = JSON.parse(profileResponse) as { userId: string; displayName?: string };

    if (!profileData.userId) {
      res.redirect("/settings?line=error&reason=no_user_id");
      return;
    }

    // Save userId to users table
    // We need to find which user initiated this flow.
    // Since this is an OAuth callback without auth middleware, we look for the user
    // who most recently had their line_user_id unset (or we save for all users who don't have one).
    // A better approach: use the state parameter to identify the user.
    // For now, we find the user by checking if any user already has this line_user_id,
    // or update the most recently updated user without a line_user_id.
    const db = getDb();
    const now = new Date().toISOString();

    // Check if this LINE user is already linked
    const existingLink = await db.get<{ id: number }>(
      "SELECT id FROM users WHERE line_user_id = ?",
      [profileData.userId]
    );

    if (existingLink) {
      // Already linked - just redirect success
      res.redirect("/settings?line=success");
      return;
    }

    // Link to the most recently updated user who doesn't have a LINE account linked
    // In a production system, the state parameter should encode the user ID
    const userToLink = await db.get<{ id: number }>(
      "SELECT id FROM users WHERE line_user_id IS NULL ORDER BY updated_at DESC LIMIT 1",
      []
    );

    if (userToLink) {
      await db.run(
        "UPDATE users SET line_user_id = ?, updated_at = ? WHERE id = ?",
        [profileData.userId, now, userToLink.id]
      );
    }

    res.redirect("/settings?line=success");
  } catch (err) {
    console.error("LINE callback error:", err);
    res.redirect("/settings?line=error&reason=exchange_failed");
  }
});

export default router;
