import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch (_error) {
    res.status(401).json({ error: "トークンが不正です" });
  }
};
