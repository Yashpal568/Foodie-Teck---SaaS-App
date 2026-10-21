import { Router } from "express";
import { isDatabaseReady } from "../config/database.js";

export const healthRouter = Router();
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ status: "ok", service: "servora-api", checks: { process: "ok" } });
});
healthRouter.get("/ready", (_req, res) => {
  const databaseReady = isDatabaseReady();
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "not_ready",
    service: "servora-api",
    checks: { database: databaseReady ? "ok" : "unavailable" }
  });
});
