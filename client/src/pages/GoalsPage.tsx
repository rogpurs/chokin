import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGoals, createGoal } from "../api/client";
import type { Goal } from "../types";
import { formatCurrency } from "../utils/format";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";

const GoalsPage = (): JSX.Element => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: 0, deadline: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchGoals();
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.target_amount <= 0) return;
    setSaving(true);
    try {
      await createGoal({
        name: form.name,
        target_amount: form.target_amount,
        deadline: form.deadline || undefined,
      });
      setForm({ name: "", target_amount: 0, deadline: "" });
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">貯金目標</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + 目標追加
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {goals.length === 0 ? (
        <EmptyState
          title="目標がありません"
          description="貯金目標を設定してモチベーションを高めましょう"
          action={{ label: "目標を追加", onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = goal.target_amount > 0
              ? Math.min(Math.round((goal.current_savings / goal.target_amount) * 100), 100)
              : 0;

            return (
              <Link key={goal.id} to={`/goals/${goal.id}`} className="card block transition-shadow hover:shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="text-xs text-muted">
                        期限: {goal.deadline}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">{progress}%</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm">
                    <span>{formatCurrency(goal.current_savings)}</span>
                    <span className="text-muted">{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {goal.monthly_target_amount != null && goal.monthly_target_amount > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    月目標: {formatCurrency(goal.monthly_target_amount)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="目標を追加">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">目標名</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="例: 旅行資金"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">目標金額</label>
            <input
              type="number"
              min={1}
              value={form.target_amount || ""}
              onChange={(e) => setForm((p) => ({ ...p, target_amount: Number(e.target.value) }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">期限（任意）</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "作成中..." : "目標を作成"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default GoalsPage;
