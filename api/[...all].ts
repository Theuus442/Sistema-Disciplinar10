import serverless from "serverless-http";
import express from "express";
import cors from "cors";

// Import route handlers directly
import { handleDemo } from "../server/routes/demo";
import {
  createUserAndProfile,
  listProfiles,
  listRecentLogins,
  listRecentActivities,
  listPermissions,
  getProfilePermissions,
  addProfilePermission,
  removeProfilePermission,
  importEmployees,
} from "../server/routes/admin";
import { listProcesses } from "../server/routes/processes";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get("/api/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});

// Demo
app.get("/api/demo", handleDemo as any);

// Admin endpoints
app.get("/api/admin/users", listProfiles as any);
app.get("/api/admin/logins", listRecentLogins as any);
app.get("/api/admin/activities", listRecentActivities as any);
app.post("/api/admin/users", createUserAndProfile as any);
app.get("/api/admin/permissions", listPermissions as any);
app.get("/api/admin/profile-permissions", getProfilePermissions as any);
app.post("/api/admin/profile-permissions", addProfilePermission as any);
app.delete("/api/admin/profile-permissions", removeProfilePermission as any);
app.post("/api/admin/import-employees", importEmployees as any);

// Processes listing (service role)
app.get("/api/processes", listProcesses as any);

const handler = serverless(app as any);
export default function api(req: any, res: any) {
  return (handler as any)(req, res);
}
