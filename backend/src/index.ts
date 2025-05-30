import express, { Request, Response } from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import { authenticateToken, optionalAuthenticate } from "./middleware/auth";
import dotenv from "dotenv";
import { userRepository } from "./repositories/userRepository";
import { sharedItemRepository } from "./repositories/sharedItemRepository";
import { ratingRepository } from "./repositories/ratingRepository";
import { reportRepository } from "./repositories/reportRepository";
import { commentRepository } from "./repositories/commentRepository";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/users", userRoutes);

app.get("/hello", async (req: Request, res: Response): Promise<void> => {
  try {
    res.json("hello world");
  } catch (error) {
    res.status(400).json({ error: "idek what could go wrong here" });
  }
});

// app.post(
//   "/items",
//   authenticateToken,
//   async (req: Request, res: Response): Promise<void> => {
//     const { title, description, imageUrl, url, price } = req.body;
//     const userId = req.user?.id;

//     if (!userId || !title || !url) {
//       res.status(400).json({ error: "Missing required fields" });
//       return;
//     }

//     try {
//       const user = await userRepository.findById(userId);

//       if (!user) {
//         res.status(404).json({ error: "User not found" });
//         return;
//       }

//       const item = await sharedItemRepository.create({
//         title,
//         description,
//         imageUrl,
//         url,
//         userId: parseInt(userId),
//         yes_count: 0,
//         no_count: 0,
//         total_count: 0,
//         category: null,
//         price: price ? Number(price) : null,
//       });

//       res.json(item);
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Failed to create item" });
//     }
//   }
// );

app.post(
  "/items",
  optionalAuthenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { title, description, imageUrl, url, price } = req.body;
    const userId = req.user?.id;

    if (!userId || !title || !url) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const user = await userRepository.findById(userId);
      console.log("Found user:", user);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const item = await sharedItemRepository.create({
        title,
        description,
        imageUrl,
        url,
        userId: userId,
        yes_count: 0,
        no_count: 0,
        total_count: 0,
        category: null,
        price: price ? Number(price) : null,
      });

      console.log("created item:", item);
      if (!item) {
        res.status(500).json({ error: "database insert failed" });
        return;
      }


      res.json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create item" });
    }
  }
);

app.get(
  "/feed",
  optionalAuthenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { cursor, limit = 10 } = req.query;
    try {
      const feedResult = await sharedItemRepository.getFeed(
        Number(limit),
        cursor ? Number(cursor) : undefined
      );

      res.json({
        items: feedResult.items,
        nextCursor: feedResult.nextCursor,
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to fetch feed" });
    }
  }
);

app.get(
  "/feed/random",
  optionalAuthenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await sharedItemRepository.getRandom();

      if (!item) {
        res.status(404).json({ error: "No items found" });
        return;
      }

      res.json({ item });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch random item" });
    }
  }
);

// protected rating endpoint
app.post(
  "/items/:itemId/rate",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { itemId } = req.params;
    const userId = req.user?.id;
    const { isPositive } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const rating = await ratingRepository.upsert(
        parseInt(userId),
        parseInt(itemId),
        isPositive
      );
      res.json(rating);
    } catch (error) {
      res.status(400).json({ error: "Failed to rate item" });
    }
  }
);

// MODERATION ENDPOINTS

// Report a post
app.post(
  "/reports/post",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { postId, reason, description } = req.body;
    const userId = req.user?.id;

    if (!userId || !postId || !reason) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const report = await reportRepository.create({
        reporter_id: userId,
        reported_item_id: parseInt(postId),
        reason,
        description: description || null,
      });

      if (!report) {
        res.status(500).json({ error: "Failed to create report" });
        return;
      }

      res.json({ message: "Report submitted successfully", report });
    } catch (error) {
      console.error("Error creating post report:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  }
);

// Report a comment
app.post(
  "/reports/comment",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { commentId, reason, description } = req.body;
    const userId = req.user?.id;

    if (!userId || !commentId || !reason) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const report = await reportRepository.create({
        reporter_id: userId,
        reported_comment_id: parseInt(commentId),
        reason,
        description: description || null,
      });

      if (!report) {
        res.status(500).json({ error: "Failed to create report" });
        return;
      }

      res.json({ message: "Report submitted successfully", report });
    } catch (error) {
      console.error("Error creating comment report:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  }
);

// Report a user
app.post(
  "/reports/user",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { userId: reportedUserId, reason, description } = req.body;
    const userId = req.user?.id;

    if (!userId || !reportedUserId || !reason) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const report = await reportRepository.create({
        reporter_id: userId,
        reported_user_id: reportedUserId,
        reason,
        description: description || null,
      });

      if (!report) {
        res.status(500).json({ error: "Failed to create report" });
        return;
      }

      res.json({ message: "Report submitted successfully", report });
    } catch (error) {
      console.error("Error creating user report:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  }
);

// Delete comment (for comment authors or post owners)
app.delete(
  "/comments/:commentId",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      // Check if user can delete this comment
      const canDelete = await commentRepository.canUserDeleteComment(
        parseInt(commentId),
        userId
      );

      if (!canDelete) {
        res.status(403).json({ 
          error: "You can only delete your own comments or comments on your posts" 
        });
        return;
      }

      const success = await commentRepository.delete(parseInt(commentId));

      if (!success) {
        res.status(500).json({ error: "Failed to delete comment" });
        return;
      }

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);

// Get reports (for admin/moderation purposes)
app.get(
  "/reports",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { status = 'pending' } = req.query;
    
    try {
      const reports = await reportRepository.getByStatus(status as string);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  }
);

const server = app.listen(process.env.PORT || 3001, () =>
  console.log(`Server ready at: http://localhost:${process.env.PORT || 3001}`)
);
