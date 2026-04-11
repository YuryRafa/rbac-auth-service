import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    name:    "rbac-auth-server",
    version: "1.0.0",
    status:  "online",
  });
});

export default router;