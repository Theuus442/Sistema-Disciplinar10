import serverless from "serverless-http";
import { createServer } from "../server";

let _handler: any | null = null;

export default async function api(req: any, res: any) {
  if (!_handler) {
    const app = createServer();
    _handler = serverless(app as any);
  }
  return (_handler as any)(req, res);
}
