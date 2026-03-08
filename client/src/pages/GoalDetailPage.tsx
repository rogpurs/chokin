import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchGoals, fetchGoalSavings, addGoalSaving, updateGoal, deleteGoal, fetchAccounts } from "../api/client";
import type { Goal, SavingRecord, Account } from "../types";
import { formatCurrency, formatDateJp } from "../utils/format";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";

const GoalDetailPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goalId = Number(id);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [savings, setSavings] = useState<SavingRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add saving form
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAmount, setSavingAmount] = useState(0);
  const [savingNote, setSavingNote] = useState("");
  const [savingAccountId, setSavingAccountId] = useState<number | null>(null);
  const [savingDate, setSavingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", target_amount: 0, deadline: "" });

  const load = useCallback(async () => {
    try {
      const [goalsData, savingsData, accs] = await Promise.all([
        fetchGoals(),
        fetchGoalSavings(goalId),
        fetchAccounts(),
      ]);
      const found = goalsData.find((g) => g.id === goalId);
      if (!found) {
        setError("目標が見つかりません");
        return;
      }
      setGoal(found);
      setSavings(savingsData);
      setAccounts(accs);
      setEditForm({
        name: found.name,
        target_amount: found.target_amount,
        deadline: found.deadline || "",
      });
      if (accs.length > 0 && !savingAccountId) {
        setSavingAccountId(accs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [goalId, savingAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddSaving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAmount <= 0) return;
    setSubmitting(true);
    try {
      await addGoalSaving(goalId, {
        amount: savingAmount,
        record_date: savingDate,
        note: savingNote || undefined,
        source_account_id: savingAccountId ?? undefined,
      });
      setSavingAmount(0);
      setSavingNote("");
      setShowAddForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateGoal(goalId, {
        name: editForm.name,
        target_amount: editForm.target_amount,
        deadline: editForm.deadline || null,
      });
      setShowEdit(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この目標を削除しますか？")) return;
    try {
      await deleteGoal(goalId);
      navigate("/goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-40 animate-pulse bg-slate-100 dark:bg-slate-800" />
        <div className="card h-32 animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!goal) {
    return (
      <EmptyState
        title="目標が見つかりません"
        description={error || "指定された目標は存在しません"}
        action={{ label: "目標一覧に戻る", onClick: () => navigate("/goals") }}
      />
    );
  }

  const progress = goal.target_amount > 0
    ? Math.min(Math.round((goal.current_savings / goal.target_amount) * 100), 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/goals")} className="btn-ghost">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">{goal.name}</h1>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Progress Card */}
      <div className="card text-center">
        <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
          <svg className="absolute inset-0" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-primary"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <span className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
        <p className="mt-3 text-lg font-bold">{formatCurrency(goal.current_savings)}</p>
        <p className="text-sm text-muted">/ {formatCurrency(goal.target_amount)}</p>
        {goal.deadline && (
          <p className="mt-2 text-xs text-muted">期限: {goal.deadline}</p>
        )}
        {goal.monthly_target_amount != null && goal.monthly_target_amount > 0 && (
          <p className="text-xs text-muted">月目標: {formatCurrency(goal.monthly_target_amount)}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex-1"
        >
          積み立てる
        </button>
        <button onClick={() => setShowEdit(true)} className="btn-secondary">
          編集
        </button>
        <button onClick={handleDelete} className="btn-danger">
          削除
        </button>
      </div>

      {/* Add Saving Form (Inline) */}
      {showAddForm && (
        <form onSubmit={handleAddSaving} className="card space-y-3">
          <h3 className="section-title">積み立て記録</h3>
          <div>
            <label className="mb-1 block text-sm font-medium">金額</label>
            <input
              type="number"
              min={1}
              value={savingAmount || ""}
              onChange={(e) => setSavingAmount(Number(e.target.value))}
              className="input-field"
              required
            />
          </div>
          {accounts.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">出金元口座</label>
              <select
                value={savingAccountId ?? ""}
                onChange={(e) => setSavingAccountId(Number(e.target.value))}
                className="input-field"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">日付</label>
            <input
              type="date"
              value={savingDate}
              onChange={(e) => setSavingDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">メモ（任意）</label>
            <input
              type="text"
              value={savingNote}
              onChange={(e) => setSavingNote(e.target.value)}
              className="input-field"
              placeholder="例: ボーナスから"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* Savings History */}
      <div className="card">
        <h3 className="section-title">積み立て履歴</h3>
        {savings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">まだ積み立て記録がありません</p>
        ) : (
          <div className="mt-3 divide-y divide-[var(--color-border)]">
            {savings.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{formatCurrency(rec.amount)}</p>
                  <p className="text-xs text-muted">
                    {formatDateJp(rec.record_date)}
                    {rec.source_account_name && ` - ${rec.source_account_name}`}
                    {rec.note && ` - ${rec.note}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="目標を編集">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">目標名</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">目標金額</label>
            <input
              type="number"
              min={1}
              value={editForm.target_amount || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, target_amount: Number(e.target.value) }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">期限（任意）</label>
            <input
              type="date"
              value={editForm.deadline}
              onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "更新中..." : "更新"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default GoalDetailPage;
