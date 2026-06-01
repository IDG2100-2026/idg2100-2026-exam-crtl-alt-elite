import express from "express";
import { identifyUser, requireUser, requireAdmin, requireVerified } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import uploadMiddleware from "../../middleware/uploads.js";
import tournamentController from "../../controllers/tournament.controller.js";
import tournamentValidator from "../../validators/tournament.validator.js";

const tournamentRouter = express.Router();

tournamentRouter.use(identifyUser);

/* Public - anyone can view tournaments */
// GET /api/tournaments
tournamentRouter.get(
    "/",
    tournamentValidator.validateGetTournaments(),
    validate,
    tournamentController.getAllTournaments
);

// GET /api/tournaments/:id
tournamentRouter.get(
    "/:id",
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.getTournament
);

// GET /api/tournaments/:id/standings
tournamentRouter.get(
    "/:id/standings",
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.getTournamentStandings
);

// GET /api/tournaments/:id/games
tournamentRouter.get(
    "/:id/games",
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.getTournamentGames
);

/* Registered and verified users only */
// POST /api/tournaments/:id/players
tournamentRouter.post(
    "/:id/players",
    requireUser,
    requireVerified,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.joinTournament
);

// DELETE /api/tournaments/:id/players/:userId
tournamentRouter.delete(
    "/:id/players/:userId",
    requireUser,
    requireVerified,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.leaveTournament
);

/* Admin only */
// POST /api/tournaments
tournamentRouter.post(
    "/",
    requireAdmin,
    uploadMiddleware.upload.single("trophyImage"),
    tournamentValidator.validateCreateTournament(),
    validate,
    tournamentController.createTournament
);

// PUT /api/tournaments/:id
tournamentRouter.put(
    "/:id",
    requireAdmin,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentValidator.validateUpdateTournament(),
    validate,
    tournamentController.updateTournament
);

// PUT /api/tournaments/:id/cancellation
tournamentRouter.put(
    "/:id/cancellation",
    requireAdmin,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.cancelTournament
);

// DELETE /api/tournaments/:id
tournamentRouter.delete(
    "/:id",
    requireAdmin,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.deleteTournament
);

export default tournamentRouter;