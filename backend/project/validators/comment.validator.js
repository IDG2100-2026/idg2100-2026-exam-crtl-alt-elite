import { body, param, query } from "express-validator";
import { validatePagination } from "./shared.validator.js";

import { MIN_COMMENT_LENGTH, MAX_COMMENT_LENGTH } from "../config/constants.js";

const VALID_TARGET_TYPES = ["game", "tournament"];

// Validates the commentId route parameter
// Used in deleteComment
export function validateCommentId() {
    return [
        param("id")
            .isMongoId()
            .withMessage("Comment ID must be a valid MongoDB ID")
    ];
}

// GET /api/comments?targetId=123&targetType=game
// Validates the query parameters for getting comments
export function validateGetComments() {
    return [
        ...validatePagination(), // Shared pagination validators

        query("targetId")
            .notEmpty()
            .withMessage("targetId is required"),

        query("targetType")
            .notEmpty()
            .withMessage("targetType is required")
            .bail()
            .isIn(VALID_TARGET_TYPES)
            .withMessage("targetType must be either 'game' or 'tournament'")
    ];
}

// GET /api/comments/recent
// Validates pagination query parameters for getting recent comments
export function validateGetRecentComments() {
    return [
        ...validatePagination() // Shared pagination validators
    ];
}

// POST /api/comments
// Validates the request body for creating a comment
export function validateCreateComment() {
    return [
        body("targetId")
            .notEmpty()
            .withMessage("targetId is required"),

        body("targetType")
            .notEmpty()
            .withMessage("targetType is required")
            .bail()
            .isIn(VALID_TARGET_TYPES)
            .withMessage("targetType must be either 'game' or 'tournament'"),

        body("content")
            .trim()
            .isLength({ min: MIN_COMMENT_LENGTH, max: MAX_COMMENT_LENGTH })
            .withMessage(`Comment must be between ${MIN_COMMENT_LENGTH} and ${MAX_COMMENT_LENGTH} characters`)
    ];
}

export default {
    validateCommentId,
    validateGetComments,
    validateGetRecentComments,
    validateCreateComment
};