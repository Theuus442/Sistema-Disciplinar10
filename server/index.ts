import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createUserAndProfile, listProfiles, listRecentLogins, listRecentActivities, listPermissions, getProfilePermissions, addProfilePermission, removeProfilePermission, importEmployees } from "./routes/admin";
import { testServiceRole } from "./routes/admin_test";
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
  // Permissions management
  app.get("/api/admin/permissions", listPermissions as any);
  app.get("/api/admin/profile-permissions", getProfilePermissions as any);
  app.post("/api/admin/profile-permissions", addProfilePermission as any);
  app.delete("/api/admin/profile-permissions", removeProfilePermission as any);

  // Import employees (CSV)
  app.post("/api/admin/import-employees", importEmployees as any);

  // Processes listing (service role)
  app.get("/api/processes", listProcesses as any);

  return app;
}
