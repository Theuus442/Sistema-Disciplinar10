import { RequestHandler } from "express";

export const handleDemo: RequestHandler = (_req, res) => {
  const response = {
    message: "Hello from Express server",
  } as const;
  res.status(200).json(response);
};
