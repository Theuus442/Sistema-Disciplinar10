import serverless from "serverless-http";
import { createServer } from "../server/index";

const app = createServer();
const handler = serverless(app as any);

export default function api(req: any, res: any) {
  return (handler as any)(req, res);
}
