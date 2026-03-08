import { getDb } from "./dbService";
import { getCurrentPeriodInfo } from "../utils/period";

const nowIso = (): string => new Date().toISOString();

export const closeCurrentPeriod = async (userId: number, comment: string): Promise<void> => {
  const db = getDb();
  const user = await db.get<{ salary_day: number }>("SELECT salary_day FROM users WHERE id = ?", [userId]);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const period = getCurrentPeriodInfo(user.salary_day);

  await db.transaction(async (tx) => {
    const existing = await tx.get<{ id: number }>(
      "SELECT id FROM periods WHERE user_id = ? AND start_date = ? AND end_date = ?",
      [userId, period.startDate, period.endDate]
    );

    let periodId = existing?.id;
    const now = nowIso();

    if (!periodId) {
      const result = await tx.run(
        `INSERT INTO periods (user_id, label, start_date, end_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, period.label, period.startDate, period.endDate, "closed", now, now]
      );
      periodId = result.lastID;
    } else {
      await tx.run("UPDATE periods SET status = ?, updated_at = ? WHERE id = ?", ["closed", now, periodId]);
    }

    const income = (await tx.get<{ total: number }>(
      "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'income' AND date BETWEEN ? AND ?",
      [userId, period.startDate, period.endDate]
    ))?.total ?? 0;

    const expense = (await tx.get<{ total: number }>(
      "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND date BETWEEN ? AND ?",
      [userId, period.startDate, period.endDate]
    ))?.total ?? 0;

    const saving = (await tx.get<{ total: number }>(
      "SELECT COALESCE(SUM(amount),0) AS total FROM saving_records WHERE user_id = ? AND record_date BETWEEN ? AND ?",
      [userId, period.startDate, period.endDate]
    ))?.total ?? 0;

    const balance = income - expense;

    const reportExists = await tx.get<{ id: number }>("SELECT id FROM monthly_reports WHERE user_id = ? AND period_id = ?", [userId, periodId]);

    if (reportExists) {
      await tx.run(
        `UPDATE monthly_reports
         SET income_amount = ?, expense_total = ?, saving_total = ?, balance_amount = ?, comment = ?, closed_at = ?, updated_at = ?
         WHERE id = ?`,
        [income, expense, saving, balance, comment || null, now, now, reportExists.id]
      );
    } else {
      await tx.run(
        `INSERT INTO monthly_reports
         (user_id, period_id, income_amount, expense_total, saving_total, balance_amount, comment, closed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, periodId, income, expense, saving, balance, comment || null, now, now, now]
      );
    }
  });
};

export const listReports = async (userId: number) => {
  const db = getDb();
  return db.all(
    `SELECT mr.id, p.label, p.start_date, p.end_date, mr.income_amount, mr.expense_total, mr.saving_total, mr.balance_amount, mr.comment, mr.closed_at
     FROM monthly_reports mr
     JOIN periods p ON p.id = mr.period_id
     WHERE mr.user_id = ?
     ORDER BY mr.closed_at DESC`,
    [userId]
  );
};
