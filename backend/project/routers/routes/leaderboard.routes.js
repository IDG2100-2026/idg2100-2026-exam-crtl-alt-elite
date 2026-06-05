import express from "express";
import leaderboardController from "../../controllers/leaderboard.controller.js";
import validate from "../../middleware/validate.js";
import leaderboardValidator from "../../validators/leaderboard.validator.js";

const leaderboardRouter = express.Router();

leaderboardRouter.get("/", leaderboardValidator.validateGetLeaderboard(), validate, leaderboardController.getLeaderBoard);

export default leaderboardRouter;
