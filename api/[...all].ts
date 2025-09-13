import serverless from "serverless-http";
import { createServer } from "../server";

const app = createServer();
const serverlessHandler = serverless(app as any);

export default function handler(req: any, res: any) {
  return (serverlessHandler as any)(req, res);
}
