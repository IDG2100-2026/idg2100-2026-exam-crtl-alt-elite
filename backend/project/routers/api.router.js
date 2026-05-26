import express from "express";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import userRoutes from "./routes/user.routes.js";
import gameRoutes from "./routes/game.routes.js";
import gameVariantRoutes from "./routes/gameVariant.routes.js";
import tournamentRoutes from "./routes/tournament.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import activityRoutes from "./routes/activity.routes.js";

const apiRouter = express.Router();

apiRouter.use(express.json());

// Auth routes first
apiRouter.use("/auth", authRoutes);

// Admin routes before other routes to avoid parameterised route conflicts
apiRouter.use("/admin", adminRoutes);

// Resource routes
apiRouter.use("/users", userRoutes);
apiRouter.use("/games", gameRoutes);
apiRouter.use("/variants", gameVariantRoutes);
apiRouter.use("/tournaments", tournamentRoutes);
apiRouter.use("/comments", commentRoutes);
apiRouter.use("/leaderboard", leaderboardRoutes);
apiRouter.use("/activity", activityRoutes);

export default apiRouter;