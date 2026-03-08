import { useState } from "react";
import { runSetup } from "../api/client";

interface SetupPageProps {
  onComplete: () => void;
}

const SetupPage = ({ onComplete }: SetupPageProps): JSX.Element => {
  const [form, setForm] = useState({
    appName: "CHOKIN",
    appDescription: "家計簿アプリ",
    baseUrl: window.location.origin,
    adminUsername: "",
    adminEmail: "",
    adminPassword: "",
    salaryDay: 25,
    lineChannelAccessToken: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "salaryDay" ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await runSetup({
        appName: form.appName,
        appDescription: form.appDescription,
        baseUrl: form.baseUrl,
        adminUsername: form.adminUsername,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        salaryDay: form.salaryDay,
        lineChannelAccessToken: form.lineChannelAccessToken || undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "セットアップに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">CHOKIN</h1>
          <p className="mt-2 text-sm text-muted">初期セットアップ</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="section-title">アプリ設定</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">アプリ名</label>
            <input
              name="appName"
              value={form.appName}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">説明</label>
            <input
              name="appDescription"
              value={form.appDescription}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">ベースURL</label>
            <input
              name="baseUrl"
              value={form.baseUrl}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <hr className="border-[var(--color-border)]" />
          <h2 className="section-title">管理者アカウント</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">ユーザー名</label>
            <input
              name="adminUsername"
              value={form.adminUsername}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">メールアドレス</label>
            <input
              name="adminEmail"
              type="email"
              value={form.adminEmail}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">パスワード</label>
            <input
              name="adminPassword"
              type="password"
              value={form.adminPassword}
              onChange={handleChange}
              className="input-field"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">給料日</label>
            <input
              name="salaryDay"
              type="number"
              min={1}
              max={31}
              value={form.salaryDay}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <hr className="border-[var(--color-border)]" />
          <h2 className="section-title">オプション</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">LINE Channel Access Token</label>
            <input
              name="lineChannelAccessToken"
              value={form.lineChannelAccessToken}
              onChange={handleChange}
              className="input-field"
              placeholder="任意"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "セットアップ中..." : "セットアップ実行"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPage;
