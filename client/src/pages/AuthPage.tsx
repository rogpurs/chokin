import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

interface AuthPageProps {
  mode: "login" | "register";
}

const AuthPage = ({ mode }: AuthPageProps): JSX.Element => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [salaryDay, setSalaryDay] = useState(25);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ username, email, password, salaryDay });
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">CHOKIN</h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "login" ? "おかえりなさい" : "アカウントを作成"}
          </p>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          className="card space-y-4"
        >
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm font-medium">ユーザー名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                required
                placeholder="taro"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
              minLength={8}
              placeholder="8文字以上"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm font-medium">給料日</label>
              <input
                type="number"
                min={1}
                max={31}
                value={salaryDay}
                onChange={(e) => setSalaryDay(Number(e.target.value))}
                className="input-field"
                required
              />
              <p className="mt-1 text-xs text-muted">毎月の給料日を入力してください</p>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? mode === "login"
                ? "ログイン中..."
                : "登録中..."
              : mode === "login"
                ? "ログイン"
                : "アカウント作成"}
          </button>

          <p className="text-center text-sm text-muted">
            {mode === "login" ? (
              <>
                アカウントがない方は
                <Link to="/register" className="ml-1 font-medium text-primary hover:underline">
                  新規登録
                </Link>
              </>
            ) : (
              <>
                既にアカウントをお持ちの方は
                <Link to="/login" className="ml-1 font-medium text-primary hover:underline">
                  ログイン
                </Link>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
