import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createUserAndProfile, listProfiles, listRecentLogins } from "./routes/admin";
import { listProcesses } from "./routes/processes";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Admin endpoints
  app.get("/api/admin/users", listProfiles as any);
  app.get("/api/admin/logins", listRecentLogins as any);
  app.get("/api/admin/activities", listRecentActivities as any);
  app.post("/api/admin/users", createUserAndProfile as any);

  return app;
}
