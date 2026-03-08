import { getDb } from "./dbService";
import { getCurrentPeriodInfo } from "../utils/period";
import type { Account, Goal } from "../types";

export const getDashboardData = async (userId: number) => {
  const db = getDb();
  const user = await db.get<{ salary_day: number }>("SELECT salary_day FROM users WHERE id = ?", [userId]);
  if (!user) {
    throw new Error("ユーザーが存在しません");
  }

  const accounts = await db.all<Account>("SELECT * FROM accounts WHERE user_id = ? ORDER BY id ASC", [userId]);
  const goals = await db.all<Goal>("SELECT * FROM goals WHERE user_id = ? ORDER BY id ASC", [userId]);

  const totalAssets = (await db.get<{ total: number }>("SELECT COALESCE(SUM(balance),0) AS total FROM accounts WHERE user_id = ?", [userId]))?.total ?? 0;
  const totalGoalAmount = (await db.get<{ total: number }>("SELECT COALESCE(SUM(target_amount),0) AS total FROM goals WHERE user_id = ?", [userId]))?.total ?? 0;
  const totalCurrentSavings = (await db.get<{ total: number }>("SELECT COALESCE(SUM(current_savings),0) AS total FROM goals WHERE user_id = ?", [userId]))?.total ?? 0;

  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    progressRate: goal.target_amount > 0 ? Math.min(100, Number(((goal.current_savings / goal.target_amount) * 100).toFixed(1))) : 0
  }));

  const overallProgressRate = totalGoalAmount > 0 ? Math.min(100, Number(((totalCurrentSavings / totalGoalAmount) * 100).toFixed(1))) : 0;

  return {
    period: getCurrentPeriodInfo(user.salary_day),
    totalAssets,
    accounts,
    goals: goalsWithProgress,
    totalGoalAmount,
    totalCurrentSavings,
    overallProgressRate
  };
};
