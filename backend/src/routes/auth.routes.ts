import { Router } from "express";
import { login, refreshToken } from "../controller/auth.controller";

const router = Router();

router.post("/login", login);
router.post("/refreshToken", refreshToken);

export default router;
