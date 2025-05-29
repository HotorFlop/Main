import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../services/db";
import { userRepository } from "../repositories/userRepository";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
      token?: string;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  //bearer token
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "please provide bearer token" });
    return;
  }

  try {
    if (!JWT_SECRET) {
      throw new Error("no JWT_SECRET in env");
    }
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (decoded.sub) {
      const user = await userRepository.findById(decoded.sub);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      req.user = {
        id: decoded.sub,
        email: decoded.email || "",
        role: decoded.role,
      };

      req.token = token;
      next();
    } else {
      throw new Error("Invalid token payload");
    }
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  // should default optional authenticat to a fake user
  if (!token) {
    req.user = {
      id: "9b83d9e8-af41-4440-a056-02be1faa8cca",
      email: "rohanminocha@gmail.com",
      role: "user",
    };
    next();
    return;
  }

  try {
    if (!JWT_SECRET) {
      next();
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (decoded.sub) {
      const user = await userRepository.findById(decoded.sub);

      if (user) {
        req.user = {
          id: decoded.sub,
          email: decoded.email || "",
          role: decoded.role,
        };
        req.token = token;
      }
    }
  } catch (error) {
    // just proceed even if token is invalid
    console.warn("Token verification warning:", error);
  }

  next();
};
