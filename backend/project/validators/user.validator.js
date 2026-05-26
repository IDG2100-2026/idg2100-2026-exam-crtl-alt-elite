import { body, param, query } from "express-validator";
import { validatePagination } from "./shared.validator.js";
import { findUserById } from "../services/user.services.js";

import {
    MIN_ID,
    MIN_PWD_LENGTH,
    MAX_PWD_LENGTH,
    MIN_AGE,
    MAX_LENGTH_ABOUT_ME
} from "../config/constants.js";

// Validates the userId route parameter
// Used in getUser, updateUser and banUser
export function validateUserId() {
    return [
        param("id")
            .isInt({ min: MIN_ID, max: Number.MAX_SAFE_INTEGER })
            .withMessage("User ID must be a valid integer")
            .bail() // Stop checking if the above fails
            .toInt() // Convert to integer for all following checks
            .custom(async (id) => {
                const user = await findUserById(id);
                if (!user) throw new Error("The user was not found");
            })
    ];
}

// GET /api/users?search=alice&page=1&limit=20
// The limit for the pagination can be changed
export function validateGetUsers() {
    return [
        ...validatePagination(), // Shared pagination validators

        query("search")
            .optional()
            .isString()
            .withMessage("search must be a string")
    ];
}

// PUT /api/users/:id
// Validates the request body for updating a user profile
// All fields are optional since the user can update one or more fields at a time
export function validateUpdateUser() {
    return [
        body("email")
            .optional({ values: "falsy" })
            .trim()
            .normalizeEmail()
            .isEmail()
            .withMessage("A valid email is required"),

        body("pwd")
            .optional()
            .isLength({ min: MIN_PWD_LENGTH, max: MAX_PWD_LENGTH })
            .withMessage(`Password must be between ${MIN_PWD_LENGTH} and ${MAX_PWD_LENGTH} characters`),

        body("age")
            .optional()
            .isInt({ min: MIN_AGE })
            .withMessage(`You must be at least ${MIN_AGE} years old`)
            .toInt(),

        body("aboutMe")
            .optional()
            .trim()
            .isLength({ max: MAX_LENGTH_ABOUT_ME })
            .withMessage(`About me can't be longer than ${MAX_LENGTH_ABOUT_ME} characters`)
    ];
}

export default {
    validateUserId,
    validateGetUsers,
    validateUpdateUser
};