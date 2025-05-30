import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../services/db";
import { userRepository } from "../repositories/userRepository";

// Use Supabase service to verify tokens instead of manual JWT verification
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
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "please provide bearer token" });
    return;
  }

  try {
    // Use Supabase to verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Supabase auth error:", error);
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }

    // Check if user exists in our database
    const dbUser = await userRepository.findById(user.id);
    
    if (!dbUser) {
      res.status(404).json({ error: "User not found in database" });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || "",
      role: user.role || "user",
    };

    req.token = token;
    next();
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

  // Default to a fake user if no token provided
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
    // Use Supabase to verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const dbUser = await userRepository.findById(user.id);
      
      if (dbUser) {
        req.user = {
          id: user.id,
          email: user.email || "",
          role: user.role || "user",
        };
        req.token = token;
      }
    }
  } catch (error) {
    console.warn("Token verification warning:", error);
  }

  next();
};
