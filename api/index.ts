import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import express from "express";
import cors from "cors";

import { createServer } from "../dist/server/server.mjs";

const app = createServer();
const handler = serverless(app as any);
export default function api(req: VercelRequest, res: VercelResponse) {
  return (handler as any)(req, res);
}
