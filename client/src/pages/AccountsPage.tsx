import { useCallback, useEffect, useState } from "react";
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from "../api/client";
import type { Account } from "../types";
import { formatCurrency } from "../utils/format";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";

const ACCOUNT_TYPES = ["現金", "普通預金", "貯蓄用", "クレジットカード"];

const AccountsPage = (): JSX.Element => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "普通預金", balance: 0 });

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", type: "", note: "" });

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalAssets = accounts
    .filter((a) => a.include_in_total_assets)
    .reduce((sum, a) => sum + a.balance, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      await createAccount({
        name: addForm.name,
        type: addForm.type,
        balance: addForm.balance,
      });
      setAddForm({ name: "", type: "普通預金", balance: 0 });
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (acc: Account) => {
    setEditId(acc.id);
    setEditForm({ name: acc.name, type: acc.type, note: acc.note || "" });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    try {
      await updateAccount(editId, {
        name: editForm.name,
        type: editForm.type,
        note: editForm.note || null,
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
    if (!confirm("この口座を削除しますか？")) return;
    try {
      await deleteAccount(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card h-20 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">口座管理</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + 口座追加
        </button>
      </div>

      {/* Total Assets */}
      <div className="card bg-primary/5">
        <p className="text-xs font-medium text-muted">総資産</p>
        <p className="text-2xl font-bold">{formatCurrency(totalAssets)}</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {accounts.length === 0 ? (
        <EmptyState
          title="口座がありません"
          description="口座を追加して残高を管理しましょう"
          action={{ label: "口座を追加", onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div key={acc.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{acc.name}</h3>
                  <p className="text-xs text-muted">{acc.type}</p>
                  {acc.note && <p className="text-xs text-muted">{acc.note}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(acc.balance)}</p>
                  {!acc.is_active && (
                    <span className="text-xs text-muted">無効</span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => openEdit(acc)} className="btn-ghost text-xs">
                  編集
                </button>
                <button onClick={() => handleDelete(acc.id)} className="btn-ghost text-xs text-danger">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="口座を追加">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">口座名</label>
            <input
              value={addForm.name}
              onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="例: メイン銀行"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">種類</label>
            <select
              value={addForm.type}
              onChange={(e) => setAddForm((p) => ({ ...p, type: e.target.value }))}
              className="input-field"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">初期残高</label>
            <input
              type="number"
              value={addForm.balance}
              onChange={(e) => setAddForm((p) => ({ ...p, balance: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "作成中..." : "口座を作成"}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="口座を編集">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">口座名</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">種類</label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
              className="input-field"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">メモ</label>
            <input
              value={editForm.note}
              onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
              className="input-field"
              placeholder="任意"
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

export default AccountsPage;
