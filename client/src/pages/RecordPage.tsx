import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTransaction, addGoalSaving, fetchAccounts, fetchCategories, fetchGoals } from "../api/client";
import type { Account, Category, Goal, TransactionType } from "../types";
import { formatCurrency } from "../utils/format";

type RecordType = "expense" | "avoid" | "saving" | "income";

interface TypeOption {
  key: RecordType;
  label: string;
  sub: string;
  color: string;
  bg: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { key: "expense", label: "使った", sub: "支出を記録", color: "text-danger", bg: "bg-danger/10" },
  { key: "avoid", label: "我慢した", sub: "使わなかった金額", color: "text-warn", bg: "bg-warn/10" },
  { key: "saving", label: "積み立てた", sub: "目標に貯金", color: "text-success", bg: "bg-success/10" },
  { key: "income", label: "入った", sub: "収入を記録", color: "text-primary", bg: "bg-primary/10" },
];

const QUICK_AMOUNTS = [500, 1000, 3000, 5000, 10000];
const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "back"];

const RecordPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [recordType, setRecordType] = useState<RecordType>("expense");
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [accs, cats, gls] = await Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchGoals(),
      ]);
      setAccounts(accs);
      setCategories(cats);
      setGoals(gls.filter((g) => g.is_active));
      if (accs.length > 0) setSelectedAccountId(accs[0].id);
    } catch {
      // Silently handle - will show empty lists
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNumpad = (key: string) => {
    if (key === "back") {
      setAmount((prev) => prev.slice(0, -1));
    } else {
      if (amount.length >= 10) return;
      setAmount((prev) => prev + key);
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmount(String(val));
  };

  const filteredCategories = categories.filter((c) => {
    if (recordType === "expense" || recordType === "avoid") return c.kind === "expense";
    if (recordType === "income") return c.kind === "income";
    return c.kind === "saving";
  });

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("金額を入力してください");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (recordType === "saving") {
        if (!selectedGoalId) {
          setError("目標を選択してください");
          setLoading(false);
          return;
        }
        await addGoalSaving(selectedGoalId, {
          amount: numAmount,
          record_date: date,
          note: note || undefined,
          source_account_id: selectedAccountId ?? undefined,
        });
      } else {
        const txType: TransactionType = recordType === "avoid" ? "avoid" : recordType;
        await createTransaction({
          amount: numAmount,
          type: txType,
          category_id: selectedCategoryId,
          from_account_id: recordType === "expense" ? selectedAccountId : undefined,
          to_account_id: recordType === "income" ? selectedAccountId : undefined,
          date,
          note: note || undefined,
        });
      }

      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="mt-4 text-lg font-semibold">保存しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with back and step indicator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))}
          className="btn-ghost"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          戻る
        </button>
        <div className="flex gap-1">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
            />
          ))}
        </div>
      </div>

      {/* Step 0: Choose type */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-center text-lg font-semibold">何を記録しますか？</h2>
          <div className="grid grid-cols-2 gap-3">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setRecordType(opt.key);
                  setStep(1);
                }}
                className={`card flex flex-col items-center gap-2 p-6 text-center transition-all hover:shadow-card-hover active:scale-[0.98] ${opt.bg}`}
              >
                <span className={`text-2xl font-bold ${opt.color}`}>{opt.label}</span>
                <span className="text-xs text-muted">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Amount input */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-center text-lg font-semibold">
            {TYPE_OPTIONS.find((t) => t.key === recordType)?.label}
          </h2>

          {/* Amount display */}
          <div className="card py-8 text-center">
            <p className="text-4xl font-bold tabular-nums">
              {amount ? formatCurrency(Number(amount)) : "\u00A50"}
            </p>
          </div>

          {/* Quick amounts */}
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => handleQuickAmount(val)}
                className="btn-secondary text-xs"
              >
                \u00A5{val.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {NUMPAD_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleNumpad(key)}
                className={`flex h-14 items-center justify-center rounded-xl text-lg font-semibold transition-colors ${
                  key === "back"
                    ? "bg-slate-100 text-muted dark:bg-slate-800"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {key === "back" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                ) : (
                  key
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (Number(amount) > 0) setStep(2);
            }}
            disabled={!amount || Number(amount) <= 0}
            className="btn-primary w-full py-3"
          >
            次へ
          </button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card text-center">
            <p className="text-xs text-muted">
              {TYPE_OPTIONS.find((t) => t.key === recordType)?.label}
            </p>
            <p className="text-2xl font-bold">{formatCurrency(Number(amount))}</p>
          </div>

          {/* Goal select for saving type */}
          {recordType === "saving" && (
            <div>
              <label className="mb-1 block text-sm font-medium">目標を選択</label>
              {goals.length === 0 ? (
                <p className="text-sm text-muted">目標がありません。先に目標を作成してください。</p>
              ) : (
                <div className="space-y-2">
                  {goals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGoalId(g.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        selectedGoalId === g.id
                          ? "border-primary bg-primary/5"
                          : "border-[var(--color-border)] hover:border-primary/30"
                      }`}
                    >
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-muted">
                        {formatCurrency(g.current_savings)} / {formatCurrency(g.target_amount)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Account select */}
          {(recordType === "expense" || recordType === "income" || recordType === "saving") && accounts.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {recordType === "income" ? "入金先" : "支払元"}口座
              </label>
              <select
                value={selectedAccountId ?? ""}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="input-field"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category select (not for saving) */}
          {recordType !== "saving" && (
            <div>
              <label className="mb-1 block text-sm font-medium">カテゴリ</label>
              {filteredCategories.length === 0 ? (
                <p className="text-sm text-muted">カテゴリがありません</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                        selectedCategoryId === cat.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-[var(--color-border)] hover:border-primary/30"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="mb-1 block text-sm font-medium">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field"
              placeholder="例: ランチ代"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? "保存中..." : "保存する"}
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordPage;
