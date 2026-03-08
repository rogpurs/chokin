import { useMemo, useState } from "react";
import { createTransaction } from "../api/client";
import type { Account, TransactionType } from "../types";

interface TransactionFormProps {
  accounts: Account[];
  onSuccess: () => Promise<void>;
}

const tabs: { label: string; value: TransactionType }[] = [
  { label: "収入", value: "income" },
  { label: "支出", value: "expense" },
  { label: "振替", value: "transfer" }
];

const today = new Date().toISOString().slice(0, 10);

const TransactionForm = ({ accounts, onSuccess }: TransactionFormProps): JSX.Element => {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const firstAccountId = useMemo(() => (accounts[0] ? String(accounts[0].id) : ""), [accounts]);

  const switchType = (next: TransactionType): void => {
    setType(next);
    setError("");
    setMessage("");
    if (next === "income") {
      setFromAccountId("");
      setToAccountId(firstAccountId);
      return;
    }
    if (next === "expense") {
      setFromAccountId(firstAccountId);
      setToAccountId("");
      return;
    }
    setFromAccountId(firstAccountId);
    setToAccountId(accounts[1] ? String(accounts[1].id) : firstAccountId);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await createTransaction({
        amount: Number(amount),
        type,
        category: category || undefined,
        from_account_id: fromAccountId ? Number(fromAccountId) : null,
        to_account_id: toAccountId ? Number(toAccountId) : null,
        date,
        note: note || undefined
      });
      setAmount("");
      setCategory("");
      setNote("");
      setMessage("保存しました");
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">入出金・振替登録</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => switchType(tab.value)}
            className={`rounded border px-3 py-2 text-sm ${type === tab.value ? "bg-primary text-white" : "bg-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form className="mt-3 grid gap-2" onSubmit={submit}>
        <input className="rounded border p-2" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="金額" required />

        {(type === "expense" || type === "transfer") && (
          <select className="rounded border p-2" value={fromAccountId} onChange={(e)=>setFromAccountId(e.target.value)} required>
            <option value="">出金元口座</option>
            {accounts.map((a)=> <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        {(type === "income" || type === "transfer") && (
          <select className="rounded border p-2" value={toAccountId} onChange={(e)=>setToAccountId(e.target.value)} required>
            <option value="">入金先口座</option>
            {accounts.map((a)=> <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        <input className="rounded border p-2" value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="カテゴリ" />
        <input className="rounded border p-2" type="date" value={date} onChange={(e)=>setDate(e.target.value)} required />
        <input className="rounded border p-2" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="メモ" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button className="rounded bg-accent px-3 py-2 text-white">保存</button>
      </form>
    </section>
  );
};

export default TransactionForm;
