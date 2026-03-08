import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createTransaction } from "../services/transactionService";
import type { TransactionType } from "../types";

const router = Router();
const allowedTypes: TransactionType[] = ["income", "expense", "transfer"];

const normalizeId = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

router.post("/transactions", requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount);
  const type = req.body?.type as TransactionType;
  const category = req.body?.category ? String(req.body.category).trim() : undefined;
  const fromAccountId = normalizeId(req.body?.from_account_id);
  const toAccountId = normalizeId(req.body?.to_account_id);
  const date = String(req.body?.date ?? "");
  const note = req.body?.note ? String(req.body.note).trim() : undefined;

  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "amount は正の整数のみ" });
    return;
  }
  if (!allowedTypes.includes(type)) {
    res.status(400).json({ error: "type は income/expense/transfer のみ" });
    return;
  }
  if (!date || Number.isNaN(new Date(date).getTime())) {
    res.status(400).json({ error: "date が不正です" });
    return;
  }
  if (type === "income" && !toAccountId) {
    res.status(400).json({ error: "income には to_account_id が必須" });
    return;
  }
  if (type === "expense" && !fromAccountId) {
    res.status(400).json({ error: "expense には from_account_id が必須" });
    return;
  }
  if (type === "transfer" && (!fromAccountId || !toAccountId || fromAccountId === toAccountId)) {
    res.status(400).json({ error: "transfer の口座指定が不正です" });
    return;
  }

  try {
    const result = await createTransaction({
      userId: req.userId!,
      amount,
      type,
      category,
      fromAccountId,
      toAccountId,
      date,
      note
    });
    res.status(201).json({ message: "取引を登録しました", updatedBalances: { from: result.updatedFrom, to: result.updatedTo } });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      res.status(404).json({ error: "口座が見つかりません" });
      return;
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      res.status(400).json({ error: "残高不足です" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "取引登録に失敗" });
  }
});

export default router;
