import { body, param, query } from "express-validator";
import { validatePagination } from "./pagination.validator.js";
import { findUserById } from "../services/user.services.js";

import {
    MIN_ID,
    MIN_PWD_LENGTH,
    MAX_PWD_LENGTH,
    MIN_AGE,
    MAX_LENGTH_ABOUT_ME
} from "../config/constants.js";

export function validateUserId() {
    return [
        param("id")
            .isInt({ min: MIN_ID, max: Number.MAX_SAFE_INTEGER })
            .withMessage("User ID must be a valid integer")
            .bail()
            .toInt()
            .custom(async (id) => {
                const user = await findUserById(id);
                if (!user) throw new Error("The user was not found");
            })
    ];
}

export function validateGetUsers() {
    return [
        ...validatePagination(),

        query("search")
            .optional()
            .isString()
            .withMessage("search must be a string")
    ];
}

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
