import { useCallback, useEffect, useState } from "react";
import { fetchTransactions, deleteTransaction } from "../api/client";
import type { Transaction, TransactionType } from "../types";
import { formatCurrency, formatDateJp } from "../utils/format";
import EmptyState from "../components/ui/EmptyState";
import { useNavigate } from "react-router-dom";

const TYPE_CONFIG: Record<TransactionType, { color: string; bg: string; label: string }> = {
  income: { color: "text-success", bg: "bg-success/10", label: "収入" },
  expense: { color: "text-danger", bg: "bg-danger/10", label: "支出" },
  transfer: { color: "text-accent", bg: "bg-accent/10", label: "振替" },
  avoid: { color: "text-warn", bg: "bg-warn/10", label: "我慢" },
};

const HistoryPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const limit = 20;

  const load = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");

    try {
      const params: Record<string, string> = {
        page: String(pageNum),
        limit: String(limit),
      };
      if (typeFilter !== "all") params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const result = await fetchTransactions(params);

      if (append) {
        setTransactions((prev) => [...prev, ...result.items]);
      } else {
        setTransactions(result.items);
      }
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    setPage(1);
    load(1, false);
  }, [load]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この取引を削除しますか？")) return;
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  // Group transactions by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const dateKey = tx.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const hasMore = transactions.length < total;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">取引履歴</h1>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "expense", "income", "avoid", "transfer"] as const).map((t) => {
            const label = t === "all" ? "すべて" : TYPE_CONFIG[t].label;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-white"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-primary/30"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="メモで検索..."
          className="input-field"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="card h-16 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="card text-center">
          <p className="text-danger">{error}</p>
          <button onClick={() => load(1, false)} className="btn-primary mt-3">
            再読み込み
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title="まだ記録がありません"
          description="取引を記録して家計を管理しましょう"
          action={{ label: "記録する", onClick: () => navigate("/record") }}
        />
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <p className="mb-2 text-xs font-semibold text-muted">{formatDateJp(dateKey)}</p>
              <div className="card divide-y divide-[var(--color-border)] p-0">
                {grouped[dateKey].map((tx) => {
                  const cfg = TYPE_CONFIG[tx.type] ?? { color: "text-muted", bg: "bg-slate-100", label: tx.type };
                  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
                  const isExpanded = expandedId === tx.id;

                  return (
                    <div key={tx.id} className="p-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                            {cfg.label[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {tx.category_name || tx.note || cfg.label}
                            </p>
                            <p className="text-xs text-muted">
                              {tx.from_account_name || tx.to_account_name || ""}
                              {tx.note && tx.category_name ? ` - ${tx.note}` : ""}
                            </p>
                          </div>
                        </div>
                        <p className={`font-semibold ${cfg.color}`}>
                          {sign}{formatCurrency(tx.amount)}
                        </p>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted">種別:</span>{" "}
                              <span className="font-medium">{cfg.label}</span>
                            </div>
                            <div>
                              <span className="text-muted">日付:</span>{" "}
                              <span className="font-medium">{formatDateJp(tx.date)}</span>
                            </div>
                            {tx.category_name && (
                              <div>
                                <span className="text-muted">カテゴリ:</span>{" "}
                                <span className="font-medium">{tx.category_name}</span>
                              </div>
                            )}
                            {tx.note && (
                              <div>
                                <span className="text-muted">メモ:</span>{" "}
                                <span className="font-medium">{tx.note}</span>
                              </div>
                            )}
                            {tx.from_account_name && (
                              <div>
                                <span className="text-muted">出金元:</span>{" "}
                                <span className="font-medium">{tx.from_account_name}</span>
                              </div>
                            )}
                            {tx.to_account_name && (
                              <div>
                                <span className="text-muted">入金先:</span>{" "}
                                <span className="font-medium">{tx.to_account_name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="btn-danger text-xs"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="btn-secondary w-full"
            >
              {loadingMore ? "読み込み中..." : "もっと表示"}
            </button>
          )}

          <p className="text-center text-xs text-muted">
            {transactions.length} / {total} 件
          </p>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
