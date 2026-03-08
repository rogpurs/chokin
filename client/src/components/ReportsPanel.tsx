import type { MonthlyReport } from "../types";
import { formatCurrency } from "../utils/format";

interface Props {
  reports: MonthlyReport[];
}

const ReportsPanel = ({ reports }: Props): JSX.Element => {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">月次レポート</h2>
      <ul className="mt-3 space-y-2">
        {reports.map((report) => (
          <li key={report.id} className="rounded border p-3">
            <p className="font-semibold">{report.label}</p>
            <p className="text-sm text-slate-600">{report.start_date}〜{report.end_date}</p>
            <p className="text-sm">収入 {formatCurrency(report.income_amount)} / 支出 {formatCurrency(report.expense_total)}</p>
            <p className="text-sm">積立 {formatCurrency(report.saving_total)} / 収支 {formatCurrency(report.balance_amount)}</p>
            <p className="text-xs text-slate-500">{report.comment || "コメントなし"}</p>
          </li>
        ))}
        {reports.length === 0 && <li className="text-sm text-slate-500">まだ月次レポートがありません</li>}
      </ul>
    </section>
  );
};

export default ReportsPanel;
