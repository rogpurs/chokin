import { getDb } from "./dbService";
import { getCurrentPeriodInfo } from "../utils/period";
import type { Account, Goal, Transaction } from "../types";

export const getDashboardData = async (userId: number) => {
  const db = getDb();
  const user = await db.get<{ salary_day: number }>("SELECT salary_day FROM users WHERE id = ?", [userId]);
  if (!user) throw new Error("ユーザーが存在しません");

  const period = getCurrentPeriodInfo(user.salary_day);

  const accounts = await db.all<Account>(
    "SELECT * FROM accounts WHERE user_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC",
    [userId]
  );
  const goals = await db.all<Goal>(
    "SELECT * FROM goals WHERE user_id = ? AND is_active = 1 ORDER BY id ASC",
    [userId]
  );

  const totalAssets = (await db.get<{ total: number }>(
    "SELECT COALESCE(SUM(balance),0) AS total FROM accounts WHERE user_id = ? AND is_active = 1 AND include_in_total_assets = 1",
    [userId]
  ))?.total ?? 0;

  // Period aggregates
  const periodIncome = (await db.get<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'income' AND deleted_at IS NULL AND date BETWEEN ? AND ?",
    [userId, period.startDate, period.endDate]
  ))?.total ?? 0;

  const periodExpense = (await db.get<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND deleted_at IS NULL AND date BETWEEN ? AND ?",
    [userId, period.startDate, period.endDate]
  ))?.total ?? 0;

  const periodSaving = (await db.get<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM saving_records WHERE user_id = ? AND record_date BETWEEN ? AND ?",
    [userId, period.startDate, period.endDate]
  ))?.total ?? 0;

  const periodAvoid = (await db.get<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'avoid' AND deleted_at IS NULL AND date BETWEEN ? AND ?",
    [userId, period.startDate, period.endDate]
  ))?.total ?? 0;

  // Category breakdown
  const categoryBreakdown = await db.all<{ category_name: string; total: number }>(
    `SELECT COALESCE(c.name, t.category, '未分類') AS category_name, SUM(t.amount) AS total
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = 'expense' AND t.deleted_at IS NULL AND t.date BETWEEN ? AND ?
     GROUP BY category_name ORDER BY total DESC`,
    [userId, period.startDate, period.endDate]
  );

  // Recent transactions
  const recentTransactions = await db.all<Transaction & { category_name: string | null; from_account_name: string | null; to_account_name: string | null }>(
    `SELECT t.*, c.name AS category_name, fa.name AS from_account_name, ta.name AS to_account_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN accounts fa ON fa.id = t.from_account_id
     LEFT JOIN accounts ta ON ta.id = t.to_account_id
     WHERE t.user_id = ? AND t.deleted_at IS NULL
     ORDER BY t.date DESC, t.id DESC LIMIT 5`,
    [userId]
  );

  // Goals progress
  const totalGoalAmount = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalCurrentSavings = goals.reduce((s, g) => s + g.current_savings, 0);
  const goalsWithProgress = goals.map((g) => ({
    ...g,
    progressRate: g.target_amount > 0 ? Math.min(100, Number(((g.current_savings / g.target_amount) * 100).toFixed(1))) : 0
  }));
  const overallProgressRate = totalGoalAmount > 0
    ? Math.min(100, Number(((totalCurrentSavings / totalGoalAmount) * 100).toFixed(1)))
    : 0;

  // Previous period comparison
  const prevStart = new Date(period.startDate);
  prevStart.setMonth(prevStart.getMonth() - 1);
  const prevEnd = new Date(period.endDate);
  prevEnd.setMonth(prevEnd.getMonth() - 1);
  const toYmd = (d: Date) => d.toISOString().slice(0, 10);

  const prevExpense = (await db.get<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND deleted_at IS NULL AND date BETWEEN ? AND ?",
    [userId, toYmd(prevStart), toYmd(prevEnd)]
  ))?.total ?? 0;

  const prevIncome = (await db.get<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'income' AND deleted_at IS NULL AND date BETWEEN ? AND ?",
    [userId, toYmd(prevStart), toYmd(prevEnd)]
  ))?.total ?? 0;

  return {
    period,
    totalAssets,
    accounts,
    goals: goalsWithProgress,
    totalGoalAmount,
    totalCurrentSavings,
    overallProgressRate,
    periodSummary: {
      income: periodIncome,
      expense: periodExpense,
      saving: periodSaving,
      avoid: periodAvoid,
      balance: periodIncome - periodExpense,
    },
    categoryBreakdown,
    recentTransactions,
    previousPeriod: { income: prevIncome, expense: prevExpense },
  };
};
