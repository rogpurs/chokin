import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../services/dbService";

const router = Router();

router.post("/onboarding/complete", requireAuth, async (req, res) => {
  const salaryDay = Number(req.body?.salaryDay ?? 25);
  const accounts: { name: string; type: string; balance: number }[] = req.body?.accounts ?? [];
  const goals: { name: string; target_amount: number; deadline?: string; current_savings?: number }[] = req.body?.goals ?? [];
  const incomeSource: { name: string; kind: string; pay_day?: number; default_amount?: number; account_index?: number } | undefined = req.body?.incomeSource;

  if (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 28) {
    res.status(400).json({ error: "給料日は1-28の整数で指定してください" }); return;
  }
  if (!accounts.length) {
    res.status(400).json({ error: "口座を1つ以上追加してください" }); return;
  }

  try {
    const db = getDb();
    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      // Update user
      await tx.run(
        "UPDATE users SET salary_day = ?, onboarding_completed_at = ?, updated_at = ? WHERE id = ?",
        [salaryDay, now, now, req.userId!]
      );

      // Create accounts
      const accountIds: number[] = [];
      for (const acct of accounts) {
        const name = String(acct.name ?? "").trim();
        const type = String(acct.type ?? "checking").trim();
        const balance = Number(acct.balance ?? 0);
        if (!name) continue;
        const r = await tx.run(
          "INSERT INTO accounts (user_id, name, type, balance, initial_balance, is_active, sort_order, include_in_total_assets, created_at, updated_at) VALUES (?,?,?,?,?,1,?,1,?,?)",
          [req.userId!, name, type, balance, balance, accountIds.length, now, now]
        );
        accountIds.push(r.lastID);
      }

      // Create goals
      for (const goal of goals) {
        const name = String(goal.name ?? "").trim();
        const targetAmount = Number(goal.target_amount ?? 0);
        if (!name || targetAmount <= 0) continue;
        await tx.run(
          "INSERT INTO goals (user_id, name, target_amount, current_savings, deadline, is_active, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?)",
          [req.userId!, name, targetAmount, Number(goal.current_savings ?? 0), goal.deadline ?? null, now, now]
        );
      }

      // Create income source
      if (incomeSource?.name) {
        const acctId = (incomeSource.account_index !== undefined && accountIds[incomeSource.account_index])
          ? accountIds[incomeSource.account_index] : null;
        await tx.run(
          "INSERT INTO income_sources (user_id, name, kind, pay_day, default_amount, account_id, is_primary, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,1,1,?,?)",
          [req.userId!, incomeSource.name.trim(), incomeSource.kind ?? "salary", incomeSource.pay_day ?? salaryDay, incomeSource.default_amount ?? null, acctId, now, now]
        );
      }
    });

    res.json({ message: "セットアップが完了しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "セットアップに失敗しました" });
  }
});

export default router;
