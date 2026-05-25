import { body, param, query } from "express-validator";

import { MIN_ID } from "../config/constants.js";

// Validates the gameId route parameter
// Used in getGame and submitGameResult
export function validateGameId() {
    return [
        param("id")
            .isInt({ min: MIN_ID, max: Number.MAX_SAFE_INTEGER })
            .withMessage("Game ID must be a valid integer")
            .bail() // stop checking if the above fails
            .toInt() // Convert to integer for all following checks
    ];
}

// GET /api/games
// Validates query parameters for getting all games
export function validateGetGames() {
    return [
        query("page")
            .optional()
            .isInt({ min: 1 })
            .withMessage("page must be a positive integer")
            .toInt(),

        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("limit must be between 1 and 100")
            .toInt(),

        // any other filters specific to that resource
        query("status")
            .optional()
            .isIn(["room", "ongoing", "finished", "cancelled"])
            .withMessage("status must be room, ongoing, finished or cancelled"),

        query("variantId")
            .optional()
            .isMongoId()
            .withMessage("variantId must be a valid MongoDB ID"),

        query("userId")
            .optional()
            .isInt({ min: MIN_ID })
            .withMessage("userId must be a valid integer")
            .toInt(),

        query("sort")
            .optional()
            .isIn(["createdAt", "startedAt", "finishedAt"])
            .withMessage("sort must be createdAt, startedAt or finishedAt"),
        
        query("order")
            .optional()
            .isIn(["asc", "desc"])
            .withMessage("order must be ascending or descending")
    ];
}

// POST /api/games
// Validates the request body for creating a game room
export function validateCreateRoom() {
    return [
        body("variantId")
            .notEmpty()
            .withMessage("variantId is required")
            .bail()
            .isMongoId()
            .withMessage("variantId must be a valid MongoDB ID")
    ];
}

export default {
    validateGameId,
    validateGetGames,
    validateCreateRoom
};