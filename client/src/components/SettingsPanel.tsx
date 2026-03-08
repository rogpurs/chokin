import { useState } from "react";
import { fetchPushPublicKey, linkLine, sendLineTest, sendPushTest, subscribePush } from "../api/client";

const base64ToUint8Array = (base64: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const SettingsPanel = (): JSX.Element => {
  const [lineUserId, setLineUserId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const enablePush = async (): Promise<void> => {
    setError("");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("通知許可が必要です");
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/push/" });
      const { publicKey } = await fetchPushPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey) as unknown as BufferSource
      });
      await subscribePush(sub.toJSON());
      setMessage("Push購読を保存しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push設定失敗");
    }
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">通知・連携設定</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded bg-primary px-3 py-2 text-white" onClick={() => void enablePush()}>Web Push有効化</button>
        <button className="rounded bg-slate-800 px-3 py-2 text-white" onClick={() => void sendPushTest()}>Pushテスト送信</button>
      </div>

      <div className="mt-4 grid gap-2">
        <input className="rounded border p-2" value={lineUserId} onChange={(e)=>setLineUserId(e.target.value)} placeholder="LINE User ID" />
        <div className="flex gap-2">
          <button className="rounded bg-accent px-3 py-2 text-white" onClick={() => void linkLine(lineUserId)}>LINE連携保存</button>
          <button className="rounded bg-slate-700 px-3 py-2 text-white" onClick={() => void sendLineTest()}>LINEテスト送信</button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
    </section>
  );
};

export default SettingsPanel;
