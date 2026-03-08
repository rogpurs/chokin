import webpush from "web-push";
import { getDb, getSetup } from "./dbService";

interface SubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const getConfiguredWebPush = () => {
  const setup = getSetup();
  if (!setup) {
    throw new Error("SETUP_REQUIRED");
  }
  webpush.setVapidDetails(`mailto:admin@localhost`, setup.vapidPublicKey, setup.vapidPrivateKey);
  return { webpush, publicKey: setup.vapidPublicKey };
};

export const getPushPublicKey = (): string => getConfiguredWebPush().publicKey;

export const saveSubscription = async (userId: number, sub: SubscriptionPayload): Promise<void> => {
  const db = getDb();
  await db.run(
    `UPDATE users
     SET push_endpoint = ?, push_p256dh = ?, push_auth = ?, push_updated_at = ?, updated_at = ?
     WHERE id = ?`,
    [sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString(), new Date().toISOString(), userId]
  );
};

export const sendTestPush = async (userId: number): Promise<void> => {
  const db = getDb();
  const user = await db.get<{ push_endpoint: string | null; push_p256dh: string | null; push_auth: string | null }>(
    "SELECT push_endpoint, push_p256dh, push_auth FROM users WHERE id = ?",
    [userId]
  );

  if (!user?.push_endpoint || !user.push_p256dh || !user.push_auth) {
    throw new Error("PUSH_NOT_SUBSCRIBED");
  }

  const subscription = {
    endpoint: user.push_endpoint,
    keys: {
      p256dh: user.push_p256dh,
      auth: user.push_auth
    }
  };

  const payload = JSON.stringify({ title: "CHOKIN", body: "テスト通知です" });

  try {
    await getConfiguredWebPush().webpush.sendNotification(subscription, payload);
  } catch (_error) {
    await db.run("UPDATE users SET push_endpoint = NULL, push_p256dh = NULL, push_auth = NULL WHERE id = ?", [userId]);
    throw new Error("PUSH_SEND_FAILED");
  }
};
