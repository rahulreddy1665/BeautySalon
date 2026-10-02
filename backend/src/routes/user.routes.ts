import { Router } from "express";

import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  getUsersController,
  updateUserController
} from "../controller/user.controller";

const router = Router();

router.post("/", createUserController);

router.get("/", getUsersController);

router.get("/:id", getUserByIdController);

router.put("/:id", updateUserController);

router.delete("/:id", deleteUserController);

export default router;