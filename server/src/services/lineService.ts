import https from "https";
import { getDb, getSetup } from "./dbService";

export const linkLineUser = async (userId: number, lineUserId: string): Promise<void> => {
  const db = getDb();
  await db.run("UPDATE users SET line_user_id = ?, updated_at = ? WHERE id = ?", [lineUserId, new Date().toISOString(), userId]);
};

export const sendLineTest = async (userId: number): Promise<void> => {
  const setup = getSetup();
  if (!setup?.lineChannelAccessToken) {
    throw new Error("LINE_NOT_CONFIGURED");
  }

  const db = getDb();
  const user = await db.get<{ line_user_id: string | null }>("SELECT line_user_id FROM users WHERE id = ?", [userId]);
  if (!user?.line_user_id) {
    throw new Error("LINE_NOT_LINKED");
  }

  const body = JSON.stringify({
    to: user.line_user_id,
    messages: [{ type: "text", text: "CHOKIN_APP テスト通知" }]
  });

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: `Bearer ${setup.lineChannelAccessToken}`
        }
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        reject(new Error(`LINE_REQUEST_FAILED_${res.statusCode ?? 0}`));
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
};
