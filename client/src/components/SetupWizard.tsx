import { useState } from "react";
import { runSetup } from "../api/client";

interface Props {
  onDone: () => Promise<void>;
}

const SetupWizard = ({ onDone }: Props): JSX.Element => {
  const [form, setForm] = useState({
    appName: "CHOKIN_APP",
    appDescription: "給料日前日締め家計アプリ",
    baseUrl: "http://localhost:3001",
    sqlitePath: "",
    adminUsername: "admin",
    adminEmail: "admin@example.com",
    adminPassword: "password12345",
    salaryDay: "25",
    lineChannelAccessToken: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await runSetup({
        appName: form.appName,
        appDescription: form.appDescription,
        baseUrl: form.baseUrl,
        sqlitePath: form.sqlitePath || undefined,
        adminUsername: form.adminUsername,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        salaryDay: Number(form.salaryDay),
        lineChannelAccessToken: form.lineChannelAccessToken || undefined
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "セットアップに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">初回セットアップ（SQLite）</h1>
      <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm">
        <input className="rounded border p-2" value={form.appName} onChange={(e)=>setForm({...form,appName:e.target.value})} placeholder="アプリ名" required />
        <input className="rounded border p-2" value={form.appDescription} onChange={(e)=>setForm({...form,appDescription:e.target.value})} placeholder="説明" required />
        <input className="rounded border p-2" value={form.baseUrl} onChange={(e)=>setForm({...form,baseUrl:e.target.value})} placeholder="Base URL" required />
        <input className="rounded border p-2" value={form.sqlitePath} onChange={(e)=>setForm({...form,sqlitePath:e.target.value})} placeholder="SQLiteパス(任意)" />

        <input className="rounded border p-2" value={form.adminUsername} onChange={(e)=>setForm({...form,adminUsername:e.target.value})} placeholder="管理者ユーザー名" required />
        <input className="rounded border p-2" value={form.adminEmail} onChange={(e)=>setForm({...form,adminEmail:e.target.value})} placeholder="管理者メール" required />
        <input className="rounded border p-2" type="password" value={form.adminPassword} onChange={(e)=>setForm({...form,adminPassword:e.target.value})} placeholder="管理者パスワード(10文字以上)" required />
        <input className="rounded border p-2" value={form.salaryDay} onChange={(e)=>setForm({...form,salaryDay:e.target.value})} placeholder="給料日(1-28)" required />
        <input className="rounded border p-2" value={form.lineChannelAccessToken} onChange={(e)=>setForm({...form,lineChannelAccessToken:e.target.value})} placeholder="LINE Channel Access Token(任意)" />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-accent px-4 py-2 text-white" disabled={loading}>{loading ? "セットアップ中..." : "セットアップ実行"}</button>
      </form>
    </main>
  );
};

export default SetupWizard;
