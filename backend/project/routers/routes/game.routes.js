import express from "express";
import { identifyUser, requireUser, requireVerified } from "../../middleware/auth.js";
import { matchmakeLimiter } from "../../middleware/ratelimiter.js";
import gameValidator from "../../validators/game.validator.js";
import gameController from "../../controllers/game.controller.js";
import validate from "../../middleware/validate.js";

const gameRouter = express.Router();

gameRouter.use(identifyUser);

/* Public - anyone can view games and spectate */
// GET /api/games
gameRouter.get("/", gameValidator.validateGetGames(), validate, gameController.getAllGames
);

// GET /api/games/:id
gameRouter.get("/:id", gameValidator.validateGameId(), validate, gameController.getGame
);

/* Registered and verified users only */
// POST /api/games
// Creates a new game room
gameRouter.post(
    "/",
    requireUser,
    requireVerified,
    matchmakeLimiter,
    gameValidator.validateCreateRoom(),
    validate,
    gameController.createRoom
);

// POST /api/games/:id/players
// Joins an existing game room
gameRouter.post(
    "/:id/players",
    requireUser,
    requireVerified,
    matchmakeLimiter,
    gameValidator.validateGameId(),
    validate,
    gameController.joinRoom
);

// DELETE /api/games/:id/players/:userId
// Leaves a game room before it starts
gameRouter.delete(
    "/:id/players/:userId",
    requireUser,
    requireVerified,
    gameValidator.validateGameId(),
    validate,
    gameController.leaveRoom
);

export default gameRouter;