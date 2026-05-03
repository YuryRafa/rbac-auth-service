import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';
import { AppError } from '../utils/app-error';
import type { JWTPayload } from '../types/auth-dtos';

export default function jwtMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token required', 401, true));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Token required', 401, true));
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret) as unknown as JWTPayload;
    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, true));
    }
    return next(new AppError('Invalid token', 401, true));
  }
}