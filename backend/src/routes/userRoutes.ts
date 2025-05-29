import express from "express";
import { authenticateToken } from "../middleware/auth";
import { userRepository } from "../repositories/userRepository";

const router = express.Router();

router.get("/me", authenticateToken, async (req, res): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await userRepository.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Failed to fetch user data" });
  }
});

export default router;
