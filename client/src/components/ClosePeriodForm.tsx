import { useState } from "react";
import { closePeriod } from "../api/client";

interface Props {
  onSaved: () => Promise<void>;
}

const ClosePeriodForm = ({ onSaved }: Props): JSX.Element => {
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await closePeriod(comment);
      setMessage("月次締めを保存しました");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失敗");
    }
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">給料日ベースの月次締め</h2>
      <form className="mt-3 grid gap-2" onSubmit={submit}>
        <textarea className="rounded border p-2" rows={3} value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="振り返りコメント(任意)" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button className="rounded bg-primary px-3 py-2 text-white">現在期間を締める</button>
      </form>
    </section>
  );
};

export default ClosePeriodForm;
