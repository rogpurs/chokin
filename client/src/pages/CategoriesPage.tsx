import { useCallback, useEffect, useState } from "react";
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "../api/client";
import type { Category } from "../types";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";

const KIND_LABELS: Record<string, string> = {
  expense: "支出",
  income: "収入",
  saving: "貯金",
};

const KIND_ORDER = ["expense", "income", "saving"];

const CategoriesPage = (): JSX.Element => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", kind: "expense" });

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABELS[kind] || kind,
    items: categories.filter((c) => c.kind === kind),
  })).filter((g) => g.items.length > 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      await createCategory({ name: addForm.name, kind: addForm.kind });
      setAddForm({ name: "", kind: "expense" });
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (cat: Category) => {
    if (cat.is_default) return;
    setEditId(cat.id);
    setEditName(cat.name);
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editName.trim()) return;
    setSaving(true);
    try {
      await updateCategory(editId, { name: editName });
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
    if (!confirm("このカテゴリを削除しますか？")) return;
    try {
      await deleteCategory(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await updateCategory(cat.id, { is_active: cat.is_active ? 0 : 1 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">カテゴリ管理</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + カテゴリ追加
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {categories.length === 0 ? (
        <EmptyState
          title="カテゴリがありません"
          description="カテゴリを追加して支出を分類しましょう"
          action={{ label: "カテゴリを追加", onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.kind}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{group.label}</h2>
              <div className="card divide-y divide-[var(--color-border)] p-0">
                {group.items.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${!cat.is_active ? "line-through text-muted" : ""}`}>
                        {cat.name}
                      </span>
                      {cat.is_default === 1 && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          デフォルト
                        </span>
                      )}
                      {!cat.is_active && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-muted dark:bg-slate-800">
                          無効
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className="btn-ghost text-xs"
                      >
                        {cat.is_active ? "無効化" : "有効化"}
                      </button>
                      {!cat.is_default && (
                        <>
                          <button onClick={() => openEdit(cat)} className="btn-ghost text-xs">
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="btn-ghost text-xs text-danger"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="カテゴリを追加">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">カテゴリ名</label>
            <input
              value={addForm.name}
              onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="例: 食費"
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
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "作成中..." : "カテゴリを作成"}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="カテゴリを編集">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">カテゴリ名</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input-field"
              required
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

export default CategoriesPage;
