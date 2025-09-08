import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import { createServer } from "../server";

const app = createServer();
const handler = serverless(app as any);

export default function api(req: VercelRequest, res: VercelResponse) {
  return (handler as any)(req, res);
}
