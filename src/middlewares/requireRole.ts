import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthenticated", 401, true));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403, true));
    }

    next();
  };
};

export default requireRole ;