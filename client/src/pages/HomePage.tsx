import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard } from "../api/client";
import type { DashboardData } from "../types";
import { formatCurrency, formatDateJp } from "../utils/format";
import { useAuth } from "../contexts/AuthContext";

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return "おやすみなさい";
  if (h < 11) return "おはようございます";
  if (h < 17) return "こんにちは";
  return "こんばんは";
};

const TX_TYPES: Record<string, { color: string; label: string; dot: string }> = {
  income: { color: "text-success", label: "収入", dot: "bg-success" },
  expense: { color: "text-danger", label: "支出", dot: "bg-danger" },
  transfer: { color: "text-accent", label: "振替", dot: "bg-accent" },
  avoid: { color: "text-warn", label: "我慢", dot: "bg-warn" },
};

const HomePage = (): JSX.Element => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await fetchDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-3xl bg-[var(--color-surface3)]" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-[var(--color-surface3)]" />)}
        </div>
        <div className="h-32 rounded-2xl bg-[var(--color-surface3)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-8">
        <p className="text-danger text-sm">{error}</p>
        <button onClick={load} className="btn-primary mt-4 px-6">再読み込み</button>
      </div>
    );
  }

  if (!data) return <></>;

  const { period, periodSummary, totalAssets, goals, accounts, categoryBreakdown, recentTransactions, previousPeriod } = data;
  const balance = periodSummary.income - periodSummary.expense;
  const displayName = user?.display_name || user?.username || "";
  const expenseTrend = previousPeriod.expense > 0 ? (periodSummary.expense <= previousPeriod.expense ? "down" : "up") : "neutral";

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Greeting ── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="label-sm">{getGreeting()}</p>
          <h1 className="page-title">{displayName}</h1>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
          {displayName[0]?.toUpperCase() || "U"}
        </div>
      </div>

      {/* ── Hero Card ── */}
      <div className="gradient-hero rounded-3xl p-5 text-white shadow-hero">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">{period.label} の残高</p>
            <p className="mt-1 text-[36px] font-bold amount-display leading-none">
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-bold leading-none">{period.daysUntilPayday}</p>
            <p className="text-xs text-white/70">日後</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-white/70 mb-1.5">
            <span>{formatDateJp(period.startDate)}</span>
            <span>{period.periodProgressRate}% 経過</span>
            <span>{formatDateJp(period.endDate)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${Math.min(period.periodProgressRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Mini stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-[11px] text-white/70">収入</p>
            <p className="text-sm font-semibold amount-display">{formatCurrency(periodSummary.income)}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-[11px] text-white/70">支出</p>
            <p className="text-sm font-semibold amount-display">{formatCurrency(periodSummary.expense)}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-[11px] text-white/70">貯金</p>
            <p className="text-sm font-semibold amount-display">{formatCurrency(periodSummary.saving)}</p>
          </div>
        </div>
      </div>

      {/* ── Total Assets ── */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="label-sm">総資産</p>
          <p className="text-[26px] font-bold amount-display leading-tight">{formatCurrency(totalAssets)}</p>
        </div>
        <Link to="/accounts" className="btn-ghost text-sm">
          口座一覧
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* ── Accounts Scroll ── */}
      {accounts.length > 0 && (
        <div className="-mx-4 px-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex-shrink-0 w-36 card-inset"
              >
                <p className="label-sm truncate">{acc.name}</p>
                <p className="mt-1.5 text-[15px] font-bold amount-display">{formatCurrency(acc.balance)}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{acc.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Goals ── */}
      {goals.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">貯金目標</h3>
            <Link to="/goals" className="btn-ghost text-sm py-1 px-2">
              すべて
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
          <div className="space-y-3">
            {goals.slice(0, 3).map((goal) => (
              <Link key={goal.id} to={`/goals/${goal.id}`} className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[14px] font-medium truncate">{goal.name}</p>
                  <p className="text-[13px] font-bold text-primary ml-2 flex-shrink-0">{goal.progressRate}%</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface2)]">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(goal.progressRate, 100)}%` }}
                  />
                </div>
                <p className="mt-1 label-sm">
                  {formatCurrency(goal.current_savings)} / {formatCurrency(goal.target_amount)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Category Breakdown ── */}
      {categoryBreakdown.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">カテゴリ別支出</h3>
            {expenseTrend !== "neutral" && (
              <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                expenseTrend === "down" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}>
                {expenseTrend === "down" ? "↓ 前期より減" : "↑ 前期より増"}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => {
              const maxAmount = Math.max(...categoryBreakdown.map((c) => c.total));
              const pct = maxAmount > 0 ? (cat.total / maxAmount) * 100 : 0;
              return (
                <div key={cat.category_name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-medium">{cat.category_name}</span>
                    <span className="text-[13px] font-semibold">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface2)]">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent Transactions ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h3 className="section-title">最近の取引</h3>
          <Link to="/history" className="btn-ghost text-sm py-1 px-2">
            すべて
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[15px] text-[var(--color-text-secondary)]">まだ取引がありません</p>
            <Link to="/record" className="btn-primary mt-4 px-5 text-sm">
              最初の記録をする
            </Link>
          </div>
        ) : (
          <div className="mt-1">
            {recentTransactions.slice(0, 6).map((tx) => {
              const cfg = TX_TYPES[tx.type] ?? { color: "text-[var(--color-text-secondary)]", label: tx.type, dot: "bg-[var(--color-surface3)]" };
              const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
              return (
                <div key={tx.id} className="list-row">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium truncate">
                        {tx.category_name || tx.note || cfg.label}
                      </p>
                      <p className="label-sm">{formatDateJp(tx.date)}</p>
                    </div>
                  </div>
                  <p className={`text-[15px] font-bold amount-display flex-shrink-0 ml-2 ${cfg.color}`}>
                    {sign}{formatCurrency(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default HomePage;
