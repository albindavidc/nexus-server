import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = crypto.randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};

// Extend Express Request interface to include 'id' without using namespaces
declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}
