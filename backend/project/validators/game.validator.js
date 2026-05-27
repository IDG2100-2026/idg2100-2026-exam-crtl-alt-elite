import { body, param, query } from "express-validator";
import { validatePagination } from "./pagination.validator.js";
import { MIN_ID } from "../config/constants.js";

// Validates the gameId route parameter
// Used in getGame, joinRoom and leaveRoom
export function validateGameId() {
    return [
        param("id")
            .isInt({ min: MIN_ID, max: Number.MAX_SAFE_INTEGER })
            .withMessage("Game ID must be a valid integer")
            .bail()
            .toInt()
    ];
}

// GET /api/games
// Validates query parameters for getting all games
export function validateGetGames() {
    return [
        ...validatePagination(), // Shared pagination validators

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
            .withMessage("order must be asc or desc")
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