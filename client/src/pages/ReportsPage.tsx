import { useCallback, useEffect, useState } from "react";
import { fetchReports, closePeriod } from "../api/client";
import type { MonthlyReport } from "../types";
import { formatCurrency, formatDateJp } from "../utils/format";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";

const ReportsPage = (): JSX.Element => {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Close period modal
  const [showClose, setShowClose] = useState(false);
  const [closeComment, setCloseComment] = useState("");
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setClosing(true);
    try {
      await closePeriod(closeComment);
      setCloseComment("");
      setShowClose(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "期間の締めに失敗しました");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card h-32 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">月次レポート</h1>
        <button onClick={() => setShowClose(true)} className="btn-primary">
          現在の期間を締める
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {reports.length === 0 ? (
        <EmptyState
          title="レポートがありません"
          description="期間を締めるとレポートが作成されます"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const balance = report.income_amount - report.expense_total;
            const isPositive = balance >= 0;

            return (
              <div key={report.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{report.label}</h3>
                    <p className="text-xs text-muted">
                      {formatDateJp(report.start_date)} 〜 {formatDateJp(report.end_date)}
                    </p>
                  </div>
                  <p className={`text-lg font-bold ${isPositive ? "text-success" : "text-danger"}`}>
                    {isPositive ? "+" : ""}{formatCurrency(balance)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted">収入</p>
                    <p className="font-semibold text-success">{formatCurrency(report.income_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">支出</p>
                    <p className="font-semibold text-danger">{formatCurrency(report.expense_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">貯金</p>
                    <p className="font-semibold text-primary">{formatCurrency(report.saving_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">残高</p>
                    <p className="font-semibold">{formatCurrency(report.balance_amount)}</p>
                  </div>
                </div>

                {report.comment && (
                  <p className="mt-3 text-sm text-muted">
                    {report.comment}
                  </p>
                )}

                <p className="mt-2 text-right text-xs text-muted">
                  締め日: {formatDateJp(report.closed_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Close Period Modal */}
      <Modal open={showClose} onClose={() => setShowClose(false)} title="期間を締める">
        <form onSubmit={handleClose} className="space-y-4">
          <p className="text-sm text-muted">
            現在の期間を締めて月次レポートを作成します。この操作は取り消せません。
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">コメント（任意）</label>
            <textarea
              value={closeComment}
              onChange={(e) => setCloseComment(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="今月の振り返りなど..."
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={closing} className="btn-primary flex-1">
              {closing ? "処理中..." : "期間を締める"}
            </button>
            <button type="button" onClick={() => setShowClose(false)} className="btn-secondary">
              キャンセル
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReportsPage;
