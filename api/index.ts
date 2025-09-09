import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";

async function getCreateServer() {
  try {
    const m = await import("../server/index.js");
    return m.createServer as () => any;
  } catch {
    const m = await import("../server/index.ts");
    return (m as any).createServer as () => any;
  }
}

const appPromise = getCreateServer().then((fn) => fn());

export default async function api(req: VercelRequest, res: VercelResponse) {
  const app = await appPromise;
  const handler = serverless(app as any);
  return (handler as any)(req, res);
}
