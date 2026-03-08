import { useState } from "react";
import { login, register, setToken } from "../api/client";
import type { User } from "../types";

interface Props {
  onLogin: (user: User) => void;
}

const AuthScreen = ({ onLogin }: Props): JSX.Element => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [salaryDay, setSalaryDay] = useState("25");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await register({ username, email, password, salaryDay: Number(salaryDay) });
      }
      const res = await login({ email, password });
      setToken(res.token);
      onLogin(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "認証に失敗しました");
    }
  };

  return (
    <main className="mx-auto max-w-md p-4 sm:p-6">
      <h1 className="text-2xl font-bold">{isRegister ? "ユーザー登録" : "ログイン"}</h1>
      <form className="mt-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm" onSubmit={submit}>
        {isRegister && (
          <input className="rounded border p-2" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="ユーザー名" required />
        )}
        <input className="rounded border p-2" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="メール" required />
        <input className="rounded border p-2" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="パスワード" required />
        {isRegister && (
          <input className="rounded border p-2" value={salaryDay} onChange={(e)=>setSalaryDay(e.target.value)} placeholder="給料日(1-28)" required />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-primary px-4 py-2 text-white">{isRegister ? "登録してログイン" : "ログイン"}</button>
      </form>
      <button className="mt-3 text-sm text-blue-700 underline" onClick={() => setIsRegister((v) => !v)}>
        {isRegister ? "ログインに切替" : "新規登録に切替"}
      </button>
    </main>
  );
};

export default AuthScreen;
