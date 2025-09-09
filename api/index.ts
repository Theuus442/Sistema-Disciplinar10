import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";

async function getCreateServer() {
  // Prefer the built server bundle produced by vite build:server
  try {
    const m = await import("../dist/server/production.mjs");
    const fn = (m as any).createServer || (m?.default?.createServer as any);
    if (typeof fn === "function") return fn;
  } catch {}
  // Fallbacks for dev or alternate builds
  try {
    const m = await import("../server/index.js");
    return (m as any).createServer as () => any;
  } catch {}
  const m = await import("../server/index.ts").catch(() => ({ default: {} as any }));
  const fn = (m as any).createServer || (m as any).default?.createServer;
  if (typeof fn !== "function") throw new Error("createServer not found in server bundle");
  return fn as () => any;
}

const handlerPromise = (async () => {
  const create = await getCreateServer();
  const app = await create();
  return serverless(app as any);
})();

export default async function api(req: VercelRequest, res: VercelResponse) {
  const handler = await handlerPromise;
  return (handler as any)(req, res);
}
