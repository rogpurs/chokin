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
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { key: "expense", label: "使った", sub: "支出を記録", emoji: "💸", color: "text-danger", bg: "bg-danger/8", border: "border-danger/20" },
  { key: "avoid", label: "我慢した", sub: "節約を記録", emoji: "💪", color: "text-warn", bg: "bg-warn/8", border: "border-warn/20" },
  { key: "saving", label: "積み立てた", sub: "目標に貯金", emoji: "🎯", color: "text-success", bg: "bg-success/8", border: "border-success/20" },
  { key: "income", label: "入った", sub: "収入を記録", emoji: "💰", color: "text-primary", bg: "bg-primary/8", border: "border-primary/20" },
];

const QUICK_AMOUNTS = [500, 1000, 3000, 5000, 10000];
const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

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
      const [accs, cats, gls] = await Promise.all([fetchAccounts(), fetchCategories(), fetchGoals()]);
      setAccounts(accs);
      setCategories(cats);
      setGoals(gls.filter((g) => g.is_active));
      if (accs.length > 0) setSelectedAccountId(accs[0].id);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNumpad = (key: string) => {
    if (key === "back") {
      setAmount((p) => p.slice(0, -1));
    } else {
      if (amount === "0" && key !== "0") {
        setAmount(key);
      } else if (amount.length < 9) {
        setAmount((p) => p + key);
      }
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (recordType === "expense" || recordType === "avoid") return c.kind === "expense";
    if (recordType === "income") return c.kind === "income";
    return c.kind === "saving";
  });

  const currentType = TYPE_OPTIONS.find((t) => t.key === recordType)!;

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) { setError("金額を入力してください"); return; }
    setError("");
    setLoading(true);
    try {
      if (recordType === "saving") {
        if (!selectedGoalId) { setError("目標を選択してください"); setLoading(false); return; }
        await addGoalSaving(selectedGoalId, { amount: numAmount, record_date: date, note: note || undefined, source_account_id: selectedAccountId ?? undefined });
      } else {
        const txType: TransactionType = recordType === "avoid" ? "avoid" : recordType;
        await createTransaction({
          amount: numAmount, type: txType,
          category_id: selectedCategoryId,
          from_account_id: recordType === "expense" ? selectedAccountId : undefined,
          to_account_id: recordType === "income" ? selectedAccountId : undefined,
          date, note: note || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => navigate("/"), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10 animate-check-pop">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[20px] font-bold">保存しました</p>
        <p className="label-sm">ホームに戻ります...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <button onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))} className="btn-ghost">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          戻る
        </button>
        {/* Step dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-6 bg-primary" : s < step ? "w-3 bg-primary/50" : "w-3 bg-[var(--color-surface3)]"}`} />
          ))}
        </div>
      </div>

      {/* ────────── Step 0: Choose Type ────────── */}
      {step === 0 && (
        <div className="space-y-3 animate-slide-up">
          <h2 className="page-title text-center">何を記録しますか？</h2>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setRecordType(opt.key); setStep(1); }}
                className={`card flex flex-col items-center gap-2.5 p-6 text-center transition-all active:scale-[0.97] border ${opt.bg} ${opt.border}`}
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className={`text-[18px] font-bold ${opt.color}`}>{opt.label}</span>
                <span className="label-sm">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ────────── Step 1: Amount ────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4 animate-slide-up">
          {/* Type badge */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">{currentType.emoji}</span>
            <span className={`text-[17px] font-semibold ${currentType.color}`}>{currentType.label}</span>
          </div>

          {/* Amount display */}
          <div className="card py-6 text-center">
            <p className={`text-[42px] font-bold amount-display leading-none ${amount ? "" : "text-[var(--color-text-secondary)]"}`}>
              {amount ? `¥${Number(amount).toLocaleString()}` : "¥0"}
            </p>
          </div>

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => setAmount(String(val))}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-all active:scale-95 ${
                  amount === String(val)
                    ? "bg-primary text-white border-primary"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                ¥{val.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {NUMPAD_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleNumpad(key)}
                className={`flex h-[60px] items-center justify-center rounded-2xl text-[20px] font-semibold transition-all active:scale-[0.94] active:brightness-95 ${
                  key === "back"
                    ? "bg-[var(--color-surface2)] text-[var(--color-text-secondary)]"
                    : "bg-[var(--color-surface)] shadow-numpad text-[var(--color-text)]"
                }`}
              >
                {key === "back" ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                ) : key}
              </button>
            ))}
          </div>

          <button
            onClick={() => { if (Number(amount) > 0) setStep(2); }}
            disabled={!amount || Number(amount) <= 0}
            className="btn-primary w-full py-4 text-[17px]"
          >
            次へ →
          </button>
        </div>
      )}

      {/* ────────── Step 2: Details ────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          {/* Amount summary */}
          <div className={`card text-center py-5 border ${currentType.bg} ${currentType.border}`}>
            <p className="label-sm">{currentType.emoji} {currentType.label}</p>
            <p className={`text-[32px] font-bold amount-display mt-1 ${currentType.color}`}>
              {formatCurrency(Number(amount))}
            </p>
          </div>

          {/* Goal select */}
          {recordType === "saving" && (
            <div>
              <p className="section-title mb-2">目標を選択</p>
              {goals.length === 0 ? (
                <p className="label-sm">目標がまだありません。先に目標を作成してください。</p>
              ) : (
                <div className="space-y-2">
                  {goals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGoalId(g.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                        selectedGoalId === g.id ? "border-primary bg-primary/5" : "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    >
                      <p className="text-[15px] font-semibold">{g.name}</p>
                      <p className="label-sm mt-0.5">{formatCurrency(g.current_savings)} / {formatCurrency(g.target_amount)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Account select */}
          {(recordType === "expense" || recordType === "income" || recordType === "saving") && accounts.length > 0 && (
            <div>
              <p className="section-title mb-2">{recordType === "income" ? "入金先" : "支払元"}口座</p>
              <div className="grid grid-cols-2 gap-2">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.97] ${
                      selectedAccountId === acc.id ? "border-primary bg-primary/5" : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    }`}
                  >
                    <p className="text-[13px] font-semibold truncate">{acc.name}</p>
                    <p className="label-sm">{formatCurrency(acc.balance)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          {recordType !== "saving" && filteredCategories.length > 0 && (
            <div>
              <p className="section-title mb-2">カテゴリ</p>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                    className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all active:scale-95 ${
                      selectedCategoryId === cat.id
                        ? "border-primary bg-primary text-white"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <p className="section-title mb-2">メモ <span className="text-[var(--color-text-secondary)] font-normal text-[13px]">（任意）</span></p>
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
            <p className="section-title mb-2">日付</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-danger/10 px-4 py-3">
              <p className="text-sm text-danger font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-4 text-[17px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                保存中...
              </span>
            ) : "保存する"}
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordPage;
