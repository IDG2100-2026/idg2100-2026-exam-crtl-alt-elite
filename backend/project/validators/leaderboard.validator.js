import { query } from "express-validator";
import { validatePagination } from "./pagination.validator.js";

export function validateGetLeaderboard() {
    return [
        ...validatePagination(),

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
