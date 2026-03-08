import { useState } from "react";
import { addGoalSaving } from "../api/client";
import type { Goal } from "../types";

interface Props {
  goals: Goal[];
  onSaved: () => Promise<void>;
}

const GoalSavingForm = ({ goals, onSaved }: Props): JSX.Element => {
  const [goalId, setGoalId] = useState("");
  const [amount, setAmount] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      await addGoalSaving(Number(goalId), { amount: Number(amount), record_date: recordDate, note: note || undefined });
      setAmount("");
      setNote("");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "積立保存に失敗");
    }
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">貯金項目への積立記録</h2>
      <form className="mt-3 grid gap-2" onSubmit={submit}>
        <select className="rounded border p-2" value={goalId} onChange={(e)=>setGoalId(e.target.value)} required>
          <option value="">目標を選択</option>
          {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
        </select>
        <input className="rounded border p-2" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="積立金額" required />
        <input type="date" className="rounded border p-2" value={recordDate} onChange={(e)=>setRecordDate(e.target.value)} required />
        <input className="rounded border p-2" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="メモ(任意)" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-accent px-3 py-2 text-white">積立を保存</button>
      </form>
    </section>
  );
};

export default GoalSavingForm;
