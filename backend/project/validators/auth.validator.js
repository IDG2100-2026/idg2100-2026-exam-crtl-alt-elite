import { body } from "express-validator";

import {
    MIN_USERNAME_LENGTH,
    MAX_USERNAME_LENGTH,
    MIN_PWD_LENGTH,
    MAX_PWD_LENGTH,
    MIN_AGE
} from "../config/constants.js";

export function validateRegister() {
    return [
        body("username")
            .trim()
            .escape()
            .isLength({ min: MIN_USERNAME_LENGTH, max: MAX_USERNAME_LENGTH })
            .withMessage(`Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters`)
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage("Username can only contain letters, numbers and underscores"),

        body("email")
            .trim()
            .normalizeEmail()
            .isEmail()
            .withMessage("A valid email is required"),

        body("pwd")
            .isLength({ min: MIN_PWD_LENGTH, max: MAX_PWD_LENGTH })
            .withMessage(`Password must be between ${MIN_PWD_LENGTH} and ${MAX_PWD_LENGTH} characters`),

        body("age")
            .isInt({ min: MIN_AGE })
            .withMessage(`You must be at least ${MIN_AGE} years old to register`)
            .toInt()
    ];
}

export function validateLogin() {
    return [
        body("emailOrUsername")
            .trim()
            .notEmpty()
            .withMessage("Email or username is required"),

        body("pwd")
            .notEmpty()
            .withMessage("Password is required")
    ];
}

export function validateResendVerification() {
    return [
        body("email")
            .trim()
            .normalizeEmail()
            .isEmail()
            .withMessage("A valid email is required")
    ];
}

export default {
    validateRegister,
    validateLogin,
    validateResendVerification
};
