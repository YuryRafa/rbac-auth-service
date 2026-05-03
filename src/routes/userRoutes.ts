import { Router } from "express";
import * as userController from "../modules/users/userController";
import jwtMiddleware from "../middlewares/jwt-middleware";
import requireRole from "../middlewares/require-role";


const router = Router();

router.get("/me", jwtMiddleware, userController.getUserMe);

router.get("/list", jwtMiddleware, requireRole('admin'), userController.getAllUsers);

router.patch("/me/password", jwtMiddleware, userController.changePassword);

export default router;