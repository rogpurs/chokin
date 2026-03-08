import { useCallback, useEffect, useState } from "react";
import { clearToken, fetchDashboard, fetchReports, fetchSetupStatus } from "./api/client";
import type { DashboardData, MonthlyReport, User } from "./types";
import SetupWizard from "./components/SetupWizard";
import AuthScreen from "./components/AuthScreen";
import ProgressBar from "./components/ProgressBar";
import TransactionForm from "./components/TransactionForm";
import GoalSavingForm from "./components/GoalSavingForm";
import ClosePeriodForm from "./components/ClosePeriodForm";
import ReportsPanel from "./components/ReportsPanel";
import SettingsPanel from "./components/SettingsPanel";
import { formatCurrency, formatDateJp } from "./utils/format";

type ScreenState = "loading" | "setup" | "auth" | "app";

const App = (): JSX.Element => {
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [error, setError] = useState("");

  const refreshAppData = useCallback(async (): Promise<void> => {
    const [dash, list] = await Promise.all([fetchDashboard(), fetchReports()]);
    setDashboard(dash);
    setReports(list);
  }, []);

  const boot = useCallback(async (): Promise<void> => {
    setError("");
    try {
      const status = await fetchSetupStatus();
      if (!status.installed) {
        setScreen("setup");
        return;
      }
      setScreen("auth");
    } catch (err) {
      setError(err instanceof Error ? err.message : "初期化失敗");
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    if (screen !== "app") {
      return;
    }
    void refreshAppData().catch((err) => {
      setError(err instanceof Error ? err.message : "データ取得失敗");
      setScreen("auth");
    });
  }, [screen, refreshAppData]);

  if (screen === "loading") {
    return <div className="p-6">読み込み中...</div>;
  }

  if (screen === "setup") {
    return <SetupWizard onDone={boot} />;
  }

  if (screen === "auth") {
    return (
      <AuthScreen
        onLogin={(nextUser) => {
          setUser(nextUser);
          setScreen("app");
        }}
      />
    );
  }

  if (!dashboard || !user) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-slate-500">ログイン中: {user.username}</p>
            <h1 className="text-2xl font-bold">{dashboard.period.label}</h1>
            <p className="text-slate-600">{formatDateJp(dashboard.period.startDate)}〜{formatDateJp(dashboard.period.endDate)}</p>
          </div>
          <button
            className="rounded bg-slate-700 px-3 py-2 text-sm text-white"
            onClick={() => {
              clearToken();
              setUser(null);
              setScreen("auth");
            }}
          >
            ログアウト
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">次の給料日まで</p>
          <p className="text-4xl font-bold text-primary">{dashboard.period.daysUntilPayday}日</p>
          <p className="text-sm text-slate-500">期間進捗 {dashboard.period.periodProgressRate}%</p>
          <div className="mt-2"><ProgressBar value={dashboard.period.periodProgressRate} /></div>
        </article>
        <article className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">全口座の合計資産</p>
          <p className="text-3xl font-bold">{formatCurrency(dashboard.totalAssets)}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">口座一覧</h2>
          <ul className="mt-3 space-y-2">
            {dashboard.accounts.map((account) => (
              <li key={account.id} className="rounded border p-3">
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-slate-500">{account.type}</p>
                <p className="text-right font-semibold">{formatCurrency(account.balance)}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">貯金目標一覧</h2>
          <ul className="mt-3 space-y-3">
            {dashboard.goals.map((goal) => (
              <li key={goal.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{goal.name}</p>
                  <p className="text-sm">{goal.progressRate}%</p>
                </div>
                <p className="text-sm">{formatCurrency(goal.current_savings)} / {formatCurrency(goal.target_amount)}</p>
                <div className="mt-2"><ProgressBar value={goal.progressRate} /></div>
                <p className="mt-1 text-xs text-slate-500">締切: {goal.deadline ?? "未設定"}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded bg-slate-100 p-3">
            <p className="text-sm">全体目標進捗 {dashboard.overallProgressRate}%</p>
            <p className="text-sm">{formatCurrency(dashboard.totalCurrentSavings)} / {formatCurrency(dashboard.totalGoalAmount)}</p>
            <div className="mt-2"><ProgressBar value={dashboard.overallProgressRate} /></div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TransactionForm accounts={dashboard.accounts} onSuccess={refreshAppData} />
        <GoalSavingForm goals={dashboard.goals} onSaved={refreshAppData} />
      </section>

      <ClosePeriodForm onSaved={refreshAppData} />
      <ReportsPanel reports={reports} />
      <SettingsPanel />
    </main>
  );
};

export default App;
