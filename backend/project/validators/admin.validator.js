import { query } from "express-validator";
import { validatePagination } from "./pagination.validator.js";

export function validateGetIncidents() {
    return [
        ...validatePagination(),

        query("type")
            .optional()
            .isIn(["ip_mismatch", "rate_limit"])
            .withMessage("type must be ip_mismatch or rate_limit")
    ];
}

export default {
    validateGetIncidents
};
