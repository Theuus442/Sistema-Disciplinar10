import serverless from "serverless-http";
import { createServer } from "../dist/server/server.mjs";

const app = createServer();
const serverlessHandler = serverless(app as any);

export default function handler(req: any, res: any) {
  return (serverlessHandler as any)(req, res);
}
