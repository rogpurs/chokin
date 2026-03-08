import { Router } from "express";
import { login, registerUser } from "../services/authService";
import { isInstalled } from "../services/dbService";

const router = Router();

router.post("/auth/register", async (req, res) => {
  if (!isInstalled()) {
    res.status(400).json({ error: "先にセットアップを実施してください" });
    return;
  }

  const username = String(req.body?.username ?? "").trim();
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  const salaryDay = Number(req.body?.salaryDay ?? 25);

  if (!username || !email || password.length < 10 || salaryDay < 1 || salaryDay > 28) {
    res.status(400).json({ error: "入力値を確認してください（password は10文字以上、salaryDay は1-28）" });
    return;
  }

  try {
    await registerUser(username, email, password, salaryDay);
    res.status(201).json({ message: "ユーザー登録完了" });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "登録失敗" });
  }
});

router.post("/auth/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    res.status(400).json({ error: "email と password は必須です" });
    return;
  }

  try {
    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "ログイン失敗" });
  }
});

export default router;
