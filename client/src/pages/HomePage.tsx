import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchDashboard } from "../api/client";
import type { DashboardData } from "../types";
import { formatCurrency, formatDateJp } from "../utils/format";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";

const HomePage = (): JSX.Element => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetchDashboard();
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center">
        <p className="text-danger">{error}</p>
        <button onClick={load} className="btn-primary mt-4">
          再読み込み
        </button>
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="データなし" description="ダッシュボードの取得に失敗しました" />;
  }

  const { period, periodSummary, totalAssets, goals, accounts, categoryBreakdown, recentTransactions, previousPeriod } = data;

  const expenseTrend = previousPeriod.expense > 0
    ? periodSummary.expense <= previousPeriod.expense ? "down" : "up"
    : "neutral";
  const incomeTrend = previousPeriod.income > 0
    ? periodSummary.income >= previousPeriod.income ? "up" : "down"
    : "neutral";

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Period Info */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">{period.label}</h2>
            <p className="text-xs text-muted">
              {formatDateJp(period.startDate)} 〜 {formatDateJp(period.endDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{period.daysUntilPayday}</p>
            <p className="text-xs text-muted">日後</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted">
            <span>期間進捗</span>
            <span>{period.periodProgressRate}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(period.periodProgressRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="今期収入"
          value={formatCurrency(periodSummary.income)}
          trend={incomeTrend}
          trendValue={previousPeriod.income > 0 ? `前期 ${formatCurrency(previousPeriod.income)}` : undefined}
        />
        <StatCard
          label="今期支出"
          value={formatCurrency(periodSummary.expense)}
          trend={expenseTrend}
          trendValue={previousPeriod.expense > 0 ? `前期 ${formatCurrency(previousPeriod.expense)}` : undefined}
        />
        <StatCard
          label="今期貯金"
          value={formatCurrency(periodSummary.saving)}
          className="bg-success/5"
        />
        <StatCard
          label="総資産"
          value={formatCurrency(totalAssets)}
        />
      </div>

      {/* Desktop: Two column layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Accounts List - Desktop */}
        <div className="card hidden md:block">
          <div className="flex items-center justify-between">
            <h3 className="section-title">口座一覧</h3>
            <Link to="/accounts" className="text-xs text-primary hover:underline">
              すべて表示
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3"
              >
                <div>
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-xs text-muted">{acc.type}</p>
                </div>
                <p className="font-semibold">{formatCurrency(acc.balance)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Progress */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="section-title">貯金目標</h3>
            <Link to="/goals" className="text-xs text-primary hover:underline">
              すべて表示
            </Link>
          </div>
          {goals.length === 0 ? (
            <p className="mt-3 text-sm text-muted">目標がまだありません</p>
          ) : (
            <div className="mt-3 space-y-3">
              {goals.slice(0, 3).map((goal) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="block rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{goal.name}</p>
                    <p className="text-sm font-semibold text-primary">{goal.progressRate}%</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(goal.progressRate, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatCurrency(goal.current_savings)} / {formatCurrency(goal.target_amount)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="card">
          <h3 className="section-title">カテゴリ別支出</h3>
          <div className="mt-3 space-y-2">
            {categoryBreakdown.map((cat) => {
              const maxAmount = Math.max(...categoryBreakdown.map((c) => c.total));
              const pct = maxAmount > 0 ? (cat.total / maxAmount) * 100 : 0;
              return (
                <div key={cat.category_name}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{cat.category_name}</span>
                    <span className="font-medium">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="section-title">最近の取引</h3>
          <Link to="/history" className="text-xs text-primary hover:underline">
            すべて表示
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">まだ取引がありません</p>
        ) : (
          <div className="mt-3 divide-y divide-[var(--color-border)]">
            {recentTransactions.slice(0, 5).map((tx) => {
              const typeConfig: Record<string, { color: string; label: string }> = {
                income: { color: "text-success", label: "収入" },
                expense: { color: "text-danger", label: "支出" },
                transfer: { color: "text-accent", label: "振替" },
                avoid: { color: "text-warn", label: "我慢" },
              };
              const cfg = typeConfig[tx.type] ?? { color: "text-muted", label: tx.type };
              const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
              return (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      tx.type === "income" ? "bg-success/10 text-success" :
                      tx.type === "expense" ? "bg-danger/10 text-danger" :
                      tx.type === "avoid" ? "bg-warn/10 text-warn" :
                      "bg-accent/10 text-accent"
                    }`}>
                      {cfg.label[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.category_name || tx.note || cfg.label}
                      </p>
                      <p className="text-xs text-muted">{formatDateJp(tx.date)}</p>
                    </div>
                  </div>
                  <p className={`font-semibold ${cfg.color}`}>
                    {sign}{formatCurrency(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-24 right-4 md:hidden">
        <button
          onClick={() => navigate("/record")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform active:scale-95"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default HomePage;
