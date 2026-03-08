import { useCallback, useEffect, useState } from "react";
import {
  updateProfile,
  updatePassword,
  fetchPushPublicKey,
  subscribePush,
  sendPushTest,
  fetchPushSubscriptions,
  getLineAuthUrl,
  sendLineTest,
} from "../api/client";
import type { PushSub } from "../types";
import { useAuth } from "../contexts/AuthContext";

type Theme = "light" | "dark" | "system";

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
};

const SettingsPage = (): JSX.Element => {
  const { user, refreshUser, logout } = useAuth();

  // Profile
  const [salaryDay, setSalaryDay] = useState(user?.salary_day ?? 25);
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    return (user?.theme as Theme) || (localStorage.getItem("theme") as Theme) || "system";
  });
  const [reduceMotion, setReduceMotion] = useState(user?.reduce_motion === 1);

  // Push
  const [pushSubs, setPushSubs] = useState<PushSub[]>([]);
  const [pushMsg, setPushMsg] = useState("");
  const [pushLoading, setPushLoading] = useState(false);

  // LINE
  const [lineMsg, setLineMsg] = useState("");
  const [lineLoading, setLineLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setSalaryDay(user.salary_day);
      setDisplayName(user.display_name ?? "");
    }
  }, [user]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const loadPushSubs = useCallback(async () => {
    try {
      const subs = await fetchPushSubscriptions();
      setPushSubs(subs);
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    loadPushSubs();
  }, [loadPushSubs]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg("");
    try {
      await updateProfile({ salary_day: salaryDay, display_name: displayName || null });
      await refreshUser();
      setProfileMsg("保存しました");
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMsg("パスワードは8文字以上にしてください");
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg("");
    try {
      await updatePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMsg("パスワードを変更しました");
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      await updateProfile({ theme: newTheme });
    } catch {
      // silently handle - local storage is the fallback
    }
  };

  const handleReduceMotion = async (checked: boolean) => {
    setReduceMotion(checked);
    try {
      await updateProfile({ reduce_motion: checked ? 1 : 0 });
    } catch {
      // silently handle
    }
  };

  const handlePushEnable = async () => {
    setPushLoading(true);
    setPushMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMsg("通知の許可がありません");
        setPushLoading(false);
        return;
      }

      const { publicKey } = await fetchPushPublicKey();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      const subJson = subscription.toJSON();
      await subscribePush({
        ...subJson,
        device_label: navigator.userAgent.includes("Mobile") ? "モバイル" : "デスクトップ",
      });
      setPushMsg("プッシュ通知を有効にしました");
      await loadPushSubs();
    } catch (err) {
      setPushMsg(err instanceof Error ? err.message : "有効化に失敗しました");
    } finally {
      setPushLoading(false);
    }
  };

  const handlePushTest = async () => {
    setPushLoading(true);
    setPushMsg("");
    try {
      const result = await sendPushTest();
      setPushMsg(`テスト通知を送信しました (${result.successCount ?? 0}件)`);
    } catch (err) {
      setPushMsg(err instanceof Error ? err.message : "テスト送信に失敗しました");
    } finally {
      setPushLoading(false);
    }
  };

  const handleLineLink = async () => {
    setLineLoading(true);
    setLineMsg("");
    try {
      const { url } = await getLineAuthUrl();
      window.open(url, "_blank");
      setLineMsg("LINE認証ページを開きました");
    } catch (err) {
      setLineMsg(err instanceof Error ? err.message : "LINE連携に失敗しました");
    } finally {
      setLineLoading(false);
    }
  };

  const handleLineTest = async () => {
    setLineLoading(true);
    setLineMsg("");
    try {
      await sendLineTest();
      setLineMsg("テストメッセージを送信しました");
    } catch (err) {
      setLineMsg(err instanceof Error ? err.message : "テスト送信に失敗しました");
    } finally {
      setLineLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">設定</h1>

      {/* Profile */}
      <form onSubmit={handleProfileSave} className="card space-y-4">
        <h2 className="section-title">プロフィール</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">表示名</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            placeholder="表示名"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">メールアドレス</label>
          <input
            value={user?.email ?? ""}
            className="input-field bg-slate-50 dark:bg-slate-800"
            readOnly
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">給料日</label>
          <input
            type="number"
            min={1}
            max={31}
            value={salaryDay}
            onChange={(e) => setSalaryDay(Number(e.target.value))}
            className="input-field"
          />
        </div>
        {profileMsg && (
          <p className={`text-sm ${profileMsg.includes("失敗") ? "text-danger" : "text-success"}`}>
            {profileMsg}
          </p>
        )}
        <button type="submit" disabled={profileSaving} className="btn-primary">
          {profileSaving ? "保存中..." : "プロフィールを保存"}
        </button>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordSave} className="card space-y-4">
        <h2 className="section-title">パスワード変更</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">現在のパスワード</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">新しいパスワード</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field"
            required
            minLength={8}
            placeholder="8文字以上"
          />
        </div>
        {passwordMsg && (
          <p className={`text-sm ${passwordMsg.includes("失敗") || passwordMsg.includes("8文字") ? "text-danger" : "text-success"}`}>
            {passwordMsg}
          </p>
        )}
        <button type="submit" disabled={passwordSaving} className="btn-primary">
          {passwordSaving ? "変更中..." : "パスワードを変更"}
        </button>
      </form>

      {/* Appearance */}
      <div className="card space-y-4">
        <h2 className="section-title">外観</h2>
        <div>
          <label className="mb-2 block text-sm font-medium">テーマ</label>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => {
              const labels: Record<Theme, string> = { light: "ライト", dark: "ダーク", system: "システム" };
              return (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    theme === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-[var(--color-border)] hover:border-primary/30"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => handleReduceMotion(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">モーションを減らす</span>
        </label>
      </div>

      {/* Push Notifications */}
      <div className="card space-y-4">
        <h2 className="section-title">通知</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePushEnable}
            disabled={pushLoading}
            className="btn-primary"
          >
            {pushLoading ? "処理中..." : "Web Push を有効化"}
          </button>
          <button
            onClick={handlePushTest}
            disabled={pushLoading}
            className="btn-secondary"
          >
            テスト通知
          </button>
        </div>
        {pushMsg && <p className="text-sm text-muted">{pushMsg}</p>}

        {pushSubs.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted">登録済みデバイス</p>
            <div className="space-y-1">
              {pushSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"
                >
                  <div>
                    <p className="text-sm">{sub.device_label || "不明なデバイス"}</p>
                    <p className="text-xs text-muted">
                      {sub.is_active ? "有効" : "無効"}
                      {sub.last_success_at && ` - 最終: ${sub.last_success_at.split("T")[0]}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LINE */}
      <div className="card space-y-4">
        <h2 className="section-title">LINE連携</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm">ステータス:</span>
          {user?.line_user_id ? (
            <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              連携済み
            </span>
          ) : (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted dark:bg-slate-800">
              未連携
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!user?.line_user_id && (
            <button
              onClick={handleLineLink}
              disabled={lineLoading}
              className="btn-primary"
            >
              {lineLoading ? "処理中..." : "LINEと連携"}
            </button>
          )}
          {user?.line_user_id && (
            <button
              onClick={handleLineTest}
              disabled={lineLoading}
              className="btn-secondary"
            >
              テストメッセージ
            </button>
          )}
        </div>
        {lineMsg && <p className="text-sm text-muted">{lineMsg}</p>}
      </div>

      {/* Data Management */}
      <div className="card space-y-4">
        <h2 className="section-title">データ管理</h2>
        <p className="text-sm text-muted">
          データのエクスポート機能は今後のアップデートで追加予定です。
        </p>
      </div>

      {/* Logout (mobile) */}
      <div className="md:hidden">
        <button onClick={logout} className="btn-danger w-full">
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
