import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

async function loadCreateServer(): Promise<() => any> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // Direct server sources (when TypeScript is compiled alongside)
    path.join(__dirname, "../server/index.js"),
    path.join(__dirname, "../server/index.mjs"),
    path.join(__dirname, "../../server/index.js"),
    path.join(__dirname, "../../server/index.mjs"),
    path.join(process.cwd(), "server/index.js"),
    path.join(process.cwd(), "server/index.mjs"),
    // Vite server build outputs
    path.join(__dirname, "../dist/server/index.js"),
    path.join(__dirname, "../dist/server/index.mjs"),
    path.join(__dirname, "../dist/server/server.js"),
    path.join(__dirname, "../dist/server/server.mjs"),
    path.join(__dirname, "../../dist/server/index.js"),
    path.join(__dirname, "../../dist/server/index.mjs"),
    path.join(__dirname, "../../dist/server/server.js"),
    path.join(__dirname, "../../dist/server/server.mjs"),
    path.join(process.cwd(), "dist/server/index.js"),
    path.join(process.cwd(), "dist/server/index.mjs"),
    path.join(process.cwd(), "dist/server/server.js"),
    path.join(process.cwd(), "dist/server/server.mjs"),
  ];
  for (const p of candidates) {
    try {
      const mod = await import(pathToFileURL(p).href);
      if (mod && typeof mod.createServer === "function") return mod.createServer as any;
    } catch {}
  }
  throw new Error(
    "Server build not found. Ensure dist/server (Vite server build) is included in the function bundle."
  );
}

let app: any | null = null;

export default async function handler(req: any, res: any) {
  if (!app) {
    const createServer = await loadCreateServer();
    app = createServer();
  }
  // Express apps are request handlers (req, res)
  return (app as any)(req, res);
}
