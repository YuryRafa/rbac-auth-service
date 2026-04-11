import {Router} from "express";
import * as userController from "../modules/users/userController";
import jwtMiddleware from "../middlewares/jwtMiddleware";
import  requireRole  from "../middlewares/requireRole";


const router = Router();

router.get("/me", jwtMiddleware, userController.getUserMe);

router.get("/list", jwtMiddleware, requireRole('admin'), userController.getAllUsers)

export default router;