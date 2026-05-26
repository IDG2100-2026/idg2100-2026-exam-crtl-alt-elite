import { query } from "express-validator";

// GET /api/admin/incidents?type=ip_mismatch&page=1&limit=20
export function validateGetIncidents() {
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

        query("type")
            .optional()
            .isIn(["ip_mismatch", "rate_limit"])
            .withMessage("type must be ip_mismatch or rate_limit")
    ];
}

export default {
    validateGetIncidents
};