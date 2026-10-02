import { Request, Response } from "express";
import { loginUser } from "../services/auth.service";

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;
console.log(req.body);

    if (!email || !password) {
        console.log("fail");
        
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }
console.log("success");
    const result = await loginUser(email, password);
console.log(result);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    console.log(error);
    
    res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Login failed",
    });
  }
};