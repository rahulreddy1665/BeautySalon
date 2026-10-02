import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;

export const generateAccessToken = (payload: object) => {
  console.log(accessSecret);

  return jwt.sign(payload, accessSecret, {
    expiresIn: "30m",
  });
};

export const generateRefreshToken = (payload: object) => {
  return jwt.sign(payload, refreshSecret, {
    expiresIn: "7d",
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, accessSecret);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, refreshSecret);
};
