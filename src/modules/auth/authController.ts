import type { NextFunction, Request, Response } from "express";
import {LoginBodySchema,RegisterBodySchema} from '../auth/auth-schemas'
import { AuthService } from "../auth/authService";
import { AppError } from "../../utils/appError";

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = RegisterBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map(i => i.message).join(", ");
      return next(new AppError(message, 422, true));
    }
    const user = await authService.register(parsed.data);
    res.status(201).json({ success: true, data: user });
  } catch (error: unknown) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map(i => i.message).join(", ");
      return next(new AppError(message, 422, true));
    }
    const result = await authService.login(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError("Refresh token required", 400, true));
    }
    const result = await authService.refresh(refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    next(error);
  }
};