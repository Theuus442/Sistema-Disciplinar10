import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createUserAndProfile, listProfiles, listRecentLogins, listRecentActivities, listPermissions, getProfilePermissions, addProfilePermission, removeProfilePermission, importEmployees, getUserPermissions, addUserPermission, removeUserPermission, getUserOverrides, saveUserOverrides, updateUserProfile } from "./routes/admin";
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
  app.patch("/api/admin/users/:id", updateUserProfile as any);
  app.put("/api/admin/users/:id", updateUserProfile as any);
  // Permissions management
  app.get("/api/admin/permissions", listPermissions as any);
  app.get("/api/admin/profile-permissions", getProfilePermissions as any);
  app.post("/api/admin/profile-permissions", addProfilePermission as any);
  app.delete("/api/admin/profile-permissions", removeProfilePermission as any);
  // Per-user permissions
  app.get("/api/admin/user-permissions/:userId", getUserPermissions as any);
  app.post("/api/admin/user-permissions", addUserPermission as any);
  app.delete("/api/admin/user-permissions", removeUserPermission as any);
  // Per-user overrides (grant/revoke)
  app.get("/api/admin/user-overrides/:userId", getUserOverrides as any);
  app.post("/api/admin/user-overrides/:userId", saveUserOverrides as any);

  // Import employees (CSV)
  app.post("/api/admin/import-employees", importEmployees as any);

  // Processes listing (service role)
  app.get("/api/processes", listProcesses as any);

  return app;
}
