import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboardData } from "../services/dashboardService";

const router = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const data = await getDashboardData(req.userId!);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "ダッシュボード取得に失敗しました" });
  }
});

export default router;
