import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { closeCurrentPeriod, listReports } from "../services/reportService";

const router = Router();

router.get("/reports", requireAuth, async (req, res) => {
  try {
    const rows = await listReports(req.userId!);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "レポート取得に失敗" });
  }
});

router.post("/periods/close", requireAuth, async (req, res) => {
  try {
    const comment = String(req.body?.comment ?? "");
    await closeCurrentPeriod(req.userId!, comment);
    res.status(201).json({ message: "月次締めを保存しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "月次締めの保存に失敗" });
  }
});

export default router;
