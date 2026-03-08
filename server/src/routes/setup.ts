import { Router } from "express";
import { isInstalled, getSetup } from "../services/dbService";
import { runInitialSetup } from "../services/setupService";

const router = Router();

router.get("/setup/status", (_req, res) => {
  res.json({ installed: isInstalled() });
});

router.post("/setup", async (req, res) => {
  try {
    await runInitialSetup(req.body);
    const setup = getSetup();
    res.status(201).json({ message: "セットアップ完了", vapidPublicKey: setup?.vapidPublicKey ?? "" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error instanceof Error ? error.message : "セットアップに失敗しました" });
  }
});

export default router;
