import { Request, Response } from "express";

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser
} from "../services/user.service";

export const createUserController = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await createUser(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error
    });
  }
};

export const getUsersController = async (
  _req: Request,
  res: Response
) => {
  try {
    const users = await getUsers();

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get users",
      error
    });
  }
};

export const getUserByIdController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get user",
      error
    });
  }
};

export const updateUserController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const user = await updateUser(
      req.params.id,
      req.body
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error
    });
  }
};

export const deleteUserController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const user = await deleteUser(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error
    });
  }
};