import { Router } from "express";

import {
  changeEmailController,
  changePasswordController,
  meController,
  login,
} from "../controller/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/change-password", authenticate, changePasswordController);
// Fresh role/permissions for the signed-in user (menu + guards stay in sync).
router.get("/me", authenticate, meController);
router.post("/change-email", authenticate, changeEmailController);

export default router;
