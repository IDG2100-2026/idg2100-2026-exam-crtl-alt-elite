import express from "express";
import { identifyUser, requireUser, requireAdmin, requireVerified } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import uploadMiddleware from "../../middleware/uploads.js";
import tournamentController from "../../controllers/tournament.controller.js";
import tournamentValidator from "../../validators/tournament.validator.js";

const tournamentRouter = express.Router();

tournamentRouter.use(identifyUser);

tournamentRouter.get(
    "/",
    tournamentValidator.validateGetTournaments(),
    validate,
    tournamentController.getAllTournaments
);

tournamentRouter.get(
    "/:id",
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.getTournament
);

tournamentRouter.get(
    "/:id/standings",
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.getTournamentStandings
);

tournamentRouter.get(
    "/:id/games",
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.getTournamentGames
);

tournamentRouter.post(
    "/:id/players",
    requireUser,
    requireVerified,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.joinTournament
);

tournamentRouter.delete(
    "/:id/players/:userId",
    requireUser,
    requireVerified,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.leaveTournament
);

tournamentRouter.post(
    "/",
    requireAdmin,
    uploadMiddleware.upload.single("trophyImage"),
    tournamentValidator.validateCreateTournament(),
    validate,
    tournamentController.createTournament
);

tournamentRouter.put(
    "/:id",
    requireAdmin,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentValidator.validateUpdateTournament(),
    validate,
    tournamentController.updateTournament
);

tournamentRouter.put(
    "/:id/cancellation",
    requireAdmin,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.cancelTournament
);

tournamentRouter.delete(
    "/:id",
    requireAdmin,
    tournamentValidator.validateTournamentId(),
    validate,
    tournamentController.deleteTournament
);

export default tournamentRouter;
