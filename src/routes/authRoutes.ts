import { Router } from "express";
import * as authController from "../modules/auth/authController";


const router = Router();

router.post("/login", authController.login)
router.post("/register", authController.register)
router.post("/refresh",  authController.refresh);
router.post("/logout",   authController.logout);

export default router;