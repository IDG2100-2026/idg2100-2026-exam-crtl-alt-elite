import { query } from "express-validator";
import {
    MIN_ROUNDS,
    MIDRANGE_ROUNDS,
    MAX_ROUNDS,
    MIN_TIME,
    MIDRANGE_TIME,
    MAX_TIME,
    MIN_PLAYERS_PER_GAME,
    MID_PLAYERS_PER_GAME,
    MAX_PLAYERS_PER_GAME,
    MIN_BUYIN,
    MID_BUYIN,
    MAX_BUYIN
} from "../config/constants.js";

// GET /api/variants?rounds=5&straightsAllowed=true&timeControl=30&numPlayers=2&buyIn=10
// Validates query parameters for filtering game variants
// Used on the lobby page to filter available game variants
export function validateGetVariants() {
    return [
        query("rounds")
            .optional()
            .isIn([MIN_ROUNDS, MIDRANGE_ROUNDS, MAX_ROUNDS].map(String))
            .withMessage(`rounds must be one of: ${MIN_ROUNDS}, ${MIDRANGE_ROUNDS}, ${MAX_ROUNDS}`),

        query("straightsAllowed")
            .optional()
            .isIn(["true", "false"])
            .withMessage("straightsAllowed must be true or false"),

        query("timeControl")
            .optional()
            .isIn([MIN_TIME, MIDRANGE_TIME, MAX_TIME].map(String))
            .withMessage(`timeControl must be one of: ${MIN_TIME}, ${MIDRANGE_TIME}, ${MAX_TIME}`),

        query("numPlayers")
            .optional()
            .isIn([MIN_PLAYERS_PER_GAME, MID_PLAYERS_PER_GAME, MAX_PLAYERS_PER_GAME].map(String))
            .withMessage(`numPlayers must be one of: ${MIN_PLAYERS_PER_GAME}, ${MID_PLAYERS_PER_GAME}, ${MAX_PLAYERS_PER_GAME}`),

        query("buyIn")
            .optional()
            .isIn([MIN_BUYIN, MID_BUYIN, MAX_BUYIN].map(String))
            .withMessage(`buyIn must be one of: ${MIN_BUYIN}, ${MID_BUYIN}, ${MAX_BUYIN}`)
    ];
}

export default {
    validateGetVariants
};