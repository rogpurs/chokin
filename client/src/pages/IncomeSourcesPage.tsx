import { useCallback, useEffect, useState } from "react";
import { fetchIncomeSources, createIncomeSource, updateIncomeSource, deleteIncomeSource } from "../api/client";
import type { IncomeSource } from "../types";
import { formatCurrency } from "../utils/format";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";

const INCOME_KINDS = ["給与", "副業", "投資", "年金", "その他"];

const IncomeSourcesPage = (): JSX.Element => {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    kind: "給与",
    pay_day: 25,
    default_amount: 0,
  });

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    kind: "給与",
    pay_day: 25,
    default_amount: 0,
  });

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchIncomeSources();
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      await createIncomeSource({
        name: addForm.name,
        kind: addForm.kind,
        pay_day: addForm.pay_day,
        default_amount: addForm.default_amount || undefined,
      });
      setAddForm({ name: "", kind: "給与", pay_day: 25, default_amount: 0 });
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (src: IncomeSource) => {
    setEditId(src.id);
    setEditForm({
      name: src.name,
      kind: src.kind,
      pay_day: src.pay_day ?? 25,
      default_amount: src.default_amount ?? 0,
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    try {
      await updateIncomeSource(editId, {
        name: editForm.name,
        kind: editForm.kind,
        pay_day: editForm.pay_day,
        default_amount: editForm.default_amount || null,
      });
      setShowEdit(false);
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この収入源を削除しますか？")) return;
    try {
      await deleteIncomeSource(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">収入源管理</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + 収入源追加
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {sources.length === 0 ? (
        <EmptyState
          title="収入源がありません"
          description="収入源を登録して収入管理を始めましょう"
          action={{ label: "収入源を追加", onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-2">
          {sources.map((src) => (
            <div key={src.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{src.name}</h3>
                    {src.is_primary === 1 && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        主要
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{src.kind}</p>
                </div>
                <div className="text-right">
                  {src.default_amount != null && src.default_amount > 0 && (
                    <p className="font-semibold">{formatCurrency(src.default_amount)}</p>
                  )}
                  {src.pay_day != null && (
                    <p className="text-xs text-muted">毎月 {src.pay_day} 日</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => openEdit(src)} className="btn-ghost text-xs">
                  編集
                </button>
                <button onClick={() => handleDelete(src.id)} className="btn-ghost text-xs text-danger">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="収入源を追加">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">名前</label>
            <input
              value={addForm.name}
              onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="例: 給与"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">種別</label>
            <select
              value={addForm.kind}
              onChange={(e) => setAddForm((p) => ({ ...p, kind: e.target.value }))}
              className="input-field"
            >
              {INCOME_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">支給日</label>
            <input
              type="number"
              min={1}
              max={31}
              value={addForm.pay_day}
              onChange={(e) => setAddForm((p) => ({ ...p, pay_day: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">推定金額</label>
            <input
              type="number"
              min={0}
              value={addForm.default_amount || ""}
              onChange={(e) => setAddForm((p) => ({ ...p, default_amount: Number(e.target.value) }))}
              className="input-field"
              placeholder="任意"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "作成中..." : "収入源を作成"}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="収入源を編集">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">名前</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">種別</label>
            <select
              value={editForm.kind}
              onChange={(e) => setEditForm((p) => ({ ...p, kind: e.target.value }))}
              className="input-field"
            >
              {INCOME_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">支給日</label>
            <input
              type="number"
              min={1}
              max={31}
              value={editForm.pay_day}
              onChange={(e) => setEditForm((p) => ({ ...p, pay_day: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">推定金額</label>
            <input
              type="number"
              min={0}
              value={editForm.default_amount || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, default_amount: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "更新中..." : "更新"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default IncomeSourcesPage;
