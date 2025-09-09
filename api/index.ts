import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import express from "express";
import cors from "cors";

import { handleDemo } from "../server/routes/demo";
import { createUserAndProfile, listProfiles, listRecentLogins, listRecentActivities } from "../server/routes/admin";
import { listProcesses } from "../server/routes/processes";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});

app.get("/api/demo", handleDemo);

// Admin endpoints (protected inside handlers)
app.get("/api/admin/users", listProfiles as any);
app.get("/api/admin/logins", listRecentLogins as any);
app.get("/api/admin/activities", listRecentActivities as any);
app.post("/api/admin/users", createUserAndProfile as any);

// Processes
app.get("/api/processes", listProcesses as any);

const handler = serverless(app as any);
export default function api(req: VercelRequest, res: VercelResponse) {
  return (handler as any)(req, res);
}
