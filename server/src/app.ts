import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import setupRouter from "./routes/setup";
import authRouter from "./routes/auth";
import dashboardRouter from "./routes/dashboard";
import transactionsRouter from "./routes/transactions";
import accountsRouter from "./routes/accounts";
import goalsRouter from "./routes/goals";
import reportsRouter from "./routes/reports";
import pushRouter from "./routes/push";
import lineRouter from "./routes/line";

export const createApp = (): express.Express => {
  const app = express();

  const origin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: false
  }));
  app.use(cors({
    origin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(express.json({ limit: "100kb" }));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "リクエストが多すぎます。しばらく待ってください" }
    })
  );

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "認証試行回数が多すぎます。15分後に再試行してください" }
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", setupRouter);
  app.use("/api", authRouter);
  app.use("/api", dashboardRouter);
  app.use("/api", transactionsRouter);
  app.use("/api", accountsRouter);
  app.use("/api", goalsRouter);
  app.use("/api", reportsRouter);
  app.use("/api", pushRouter);
  app.use("/api", lineRouter);

  if (fs.existsSync(config.clientDistPath)) {
    app.use(express.static(config.clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(config.clientDistPath, "index.html"));
    });
  }

  return app;
};
