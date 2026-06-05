import { body, param, query } from "express-validator";
import { validatePagination } from "./pagination.validator.js";
import { findTournamentById } from "../services/tournament.services.js";

import {
    MIN_ID,
    MIN_TITLE_LENGTH,
    MAX_TITLE_LENGTH,
    MIN_DESCRIPTION_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    MIN_PLAYERS,
    LOW_RANGE_PLAYERS,
    HIGH_RANGE_PLAYERS,
    MAX_PLAYERS
} from "../config/constants.js";

export function validateTournamentId() {
    return [
        param("id")
            .isInt({ min: MIN_ID, max: Number.MAX_SAFE_INTEGER })
            .withMessage("Tournament ID must be a valid integer")
            .bail()
            .toInt()
            .custom(async (id) => {
                const tournament = await findTournamentById(id);
                if (!tournament) throw new Error("Tournament was not found");
            })
    ];
}

export function validateGetTournaments() {
    return [
        ...validatePagination(),

        query("status")
            .optional()
            .isIn(["upcoming", "ongoing", "finished", "cancelled"])
            .withMessage("status must be upcoming, ongoing, finished or cancelled"),

        query("sort")
            .optional()
            .isIn(["scheduledAt", "title", "players"])
            .withMessage("sort must be scheduledAt, title or players"),

        query("order")
            .optional()
            .isIn(["asc", "desc"])
            .withMessage("order must be asc or desc"),

        query("search")
            .optional()
            .isString()
            .withMessage("search must be a string")
            .isLength({ min: 3 })
            .withMessage("search term must be at least 3 characters")
    ];
}

export function validateCreateTournament() {
    return [
        body("title")
            .trim()
            .escape()
            .isLength({ min: MIN_TITLE_LENGTH, max: MAX_TITLE_LENGTH })
            .withMessage(`Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`),

        body("description")
            .optional()
            .trim()
            .escape()
            .isLength({ min: MIN_DESCRIPTION_LENGTH, max: MAX_DESCRIPTION_LENGTH })
            .withMessage(`Description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`),

        body("variantId")
            .notEmpty()
            .withMessage("variantId is required")
            .bail()
            .isMongoId()
            .withMessage("variantId must be a valid MongoDB ID"),

        body("maxPlayers")
            .notEmpty()
            .withMessage("maxPlayers is required")
            .bail()
            .isInt()
            .withMessage("maxPlayers must be an integer")
            .bail()
            .isIn([MIN_PLAYERS, LOW_RANGE_PLAYERS, HIGH_RANGE_PLAYERS, MAX_PLAYERS])
            .withMessage(`maxPlayers must be one of: ${MIN_PLAYERS}, ${LOW_RANGE_PLAYERS}, ${HIGH_RANGE_PLAYERS}, ${MAX_PLAYERS}`)
            .toInt(),

        body("breakDuration")
            .optional()
            .isInt({ min: 0 })
            .withMessage("breakDuration can't be a negative integer")
            .toInt(),

        body("numRounds")
            .notEmpty()
            .withMessage("numRounds is required")
            .bail()
            .isInt({ min: 1 })
            .withMessage("numRounds must be a positive integer")
            .toInt(),

        body("scheduledAt")
            .notEmpty()
            .withMessage("scheduledAt is required")
            .bail()
            .isISO8601()
            .withMessage("scheduledAt must be a valid date")
            .bail()
            .toDate()
            .custom((date) => {
                if (date <= new Date()) throw new Error("Tournament must be scheduled in the future");
                return true;
            }),

        body("trophyTitle")
            .trim()
            .escape()
            .notEmpty()
            .withMessage("trophyTitle is required"),

        body("eloMin")
            .optional()
            .isInt({ min: 0 })
            .withMessage("eloMin must be a non-negative integer")
            .toInt(),

        body("eloMax")
            .optional()
            .isInt({ min: 0 })
            .withMessage("eloMax must be a non-negative integer")
            .toInt(),

        body("eloMin").custom((eloMin, { req }) => {
            const eloMax = req.body.eloMax;
            const hasMin = eloMin !== undefined && eloMin !== null;
            const hasMax = eloMax !== undefined && eloMax !== null;

            if (hasMin !== hasMax) {
                throw new Error("eloMin and eloMax must both be provided or both omitted");
            }

            if (hasMin && hasMax && eloMin >= eloMax) {
                throw new Error("eloMin must be less than eloMax");
            }

            return true;
        })
    ];
}

export function validateUpdateTournament() {
    return [
        body("title")
            .optional()
            .trim()
            .escape()
            .isLength({ min: MIN_TITLE_LENGTH, max: MAX_TITLE_LENGTH })
            .withMessage(`Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`),

        body("description")
            .optional()
            .trim()
            .escape()
            .isLength({ min: MIN_DESCRIPTION_LENGTH, max: MAX_DESCRIPTION_LENGTH })
            .withMessage(`Description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`),

        body("maxPlayers")
            .optional()
            .isInt()
            .withMessage("maxPlayers must be an integer")
            .bail()
            .isIn([MIN_PLAYERS, LOW_RANGE_PLAYERS, HIGH_RANGE_PLAYERS, MAX_PLAYERS])
            .withMessage(`maxPlayers must be one of: ${MIN_PLAYERS}, ${LOW_RANGE_PLAYERS}, ${HIGH_RANGE_PLAYERS}, ${MAX_PLAYERS}`)
            .toInt(),

        body("breakDuration")
            .optional()
            .isInt({ min: 0 })
            .withMessage("breakDuration can't be a negative integer")
            .toInt(),

        body("numRounds")
            .optional()
            .isInt({ min: 1 })
            .withMessage("numRounds must be a positive integer")
            .toInt(),

        body("scheduledAt")
            .optional()
            .isISO8601()
            .withMessage("scheduledAt must be a valid date")
            .bail()
            .toDate()
            .custom((date) => {
                if (date <= new Date()) throw new Error("Tournament must be scheduled in the future");
                return true;
            }),

        body("eloMin")
            .optional()
            .isInt({ min: 0 })
            .withMessage("eloMin must be a non-negative integer")
            .toInt(),

        body("eloMax")
            .optional()
            .isInt({ min: 0 })
            .withMessage("eloMax must be a non-negative integer")
            .toInt(),

        body("eloMin").custom((eloMin, { req }) => {
            const eloMax = req.body.eloMax;
            const hasMin = eloMin !== undefined && eloMin !== null;
            const hasMax = eloMax !== undefined && eloMax !== null;

            if (hasMin !== hasMax) {
                throw new Error("eloMin and eloMax must both be provided or both omitted");
            }

            if (hasMin && hasMax && eloMin >= eloMax) {
                throw new Error("eloMin must be less than eloMax");
            }

            return true;
        })
    ];
}

export default {
    validateTournamentId,
    validateGetTournaments,
    validateCreateTournament,
    validateUpdateTournament
};
