import type { Request, Response, NextFunction } from "express";
import { UserService } from "./userService";

const userService = new UserService();

export const getUserMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUser(req.user!.sub);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};