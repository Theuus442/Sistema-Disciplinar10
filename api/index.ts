import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import { createServer } from "../dist/server/server.mjs";

const app = createServer();
const handler = serverless(app as any);

export default function api(req: any, res: any) {
  return (handler as any)(req, res);
}
