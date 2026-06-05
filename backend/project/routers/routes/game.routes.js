import express from "express";
import { identifyUser, requireUser, requireVerified } from "../../middleware/auth.js";
import { matchmakeLimiter } from "../../middleware/ratelimiter.js";
import gameValidator from "../../validators/game.validator.js";
import gameController from "../../controllers/game.controller.js";
import validate from "../../middleware/validate.js";

const gameRouter = express.Router();

gameRouter.use(identifyUser);

gameRouter.get("/", gameValidator.validateGetGames(), validate, gameController.getAllGames);

gameRouter.get("/:id", gameValidator.validateGameId(), validate, gameController.getGame);

gameRouter.post(
    "/",
    requireUser,
    requireVerified,
    matchmakeLimiter,
    gameValidator.validateCreateRoom(),
    validate,
    gameController.createRoom
);

gameRouter.post(
    "/:id/players",
    requireUser,
    requireVerified,
    matchmakeLimiter,
    gameValidator.validateGameId(),
    validate,
    gameController.joinRoom
);

gameRouter.delete(
    "/:id/players/:userId",
    requireUser,
    requireVerified,
    gameValidator.validateGameId(),
    validate,
    gameController.leaveRoom
);

export default gameRouter;
