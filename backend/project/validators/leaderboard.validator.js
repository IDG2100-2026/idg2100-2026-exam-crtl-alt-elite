import { query } from "express-validator";
import { validatePagination } from "./shared.validator.js";

// GET /api/leaderboard?sort=elo&page=1&limit=20&variantId=123
export function validateGetLeaderboard() {
    return [
        ...validatePagination(), // Shared pagination validators

        query("sort")
            .optional()
            .isIn(["elo", "wins", "winPercentage", "totalGames"])
            .withMessage("sort must be elo, wins, winPercentage or totalGames"),

        query("variantId")
            .optional()
            .isMongoId()
            .withMessage("variantId must be a valid MongoDB ID")
    ];
}

export default {
    validateGetLeaderboard
};