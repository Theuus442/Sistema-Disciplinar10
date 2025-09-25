import serverless from "serverless-http";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

async function loadCreateServer(): Promise<() => any> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(__dirname, "../dist/server/server.mjs"),
    path.join(__dirname, "../../dist/server/server.mjs"),
  ];
  for (const p of candidates) {
    try {
      const mod = await import(pathToFileURL(p).href);
      if (mod && typeof mod.createServer === "function") return mod.createServer as any;
    } catch {}
  }
  const mod = await import("../server/index");
  return (mod as any).createServer as any;
}

let _handler: any | null = null;

export default async function api(req: any, res: any) {
  if (!_handler) {
    const createServer = await loadCreateServer();
    const app = createServer();
    _handler = serverless(app as any);
  }
  return (_handler as any)(req, res);
}
