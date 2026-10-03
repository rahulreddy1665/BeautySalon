import { Router } from "express";

import {
  changeEmailController,
  changePasswordController,
  login,
} from "../controller/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/change-password", authenticate, changePasswordController);
router.post("/change-email", authenticate, changeEmailController);

export default router;
