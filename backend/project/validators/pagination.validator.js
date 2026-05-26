import { query } from "express-validator";

// Shared pagination validators
// Used across multiple validator files to avoid duplication
// Returns an array of validators that can be spread into any validator function
export function validatePagination() {
    return [
        query("page")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Page must be a positive integer")
            .toInt(),

        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("limit must be between 1 and 100")
            .toInt()
    ];
}

export default {
    validatePagination
};