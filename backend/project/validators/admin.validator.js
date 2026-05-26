import { query } from "express-validator";
import { validatePagination } from "./shared.validator.js";

// GET /api/admin/incidents?type=ip_mismatch&page=1&limit=20
export function validateGetIncidents() {
    return [
        ...validatePagination(), // Shared pagination validators

        query("type")
            .optional()
            .isIn(["ip_mismatch", "rate_limit"])
            .withMessage("type must be ip_mismatch or rate_limit")
    ];
}

export default {
    validateGetIncidents
};