import { Comment } from "../models/comment.js";
import { User } from "../models/user.js";
import commentServices from "../services/comment.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

// GET /api/comments?targetId=123&targetType=game
// Public, returns all comments for a specific game or tournament
export async function getComments(req, res, next) {
    try {
        // Pagination related
        const { targetId, targetType, page = PAGE, limit = LIMIT } = req.validData;

        // Both required to identify what we're fetching comments for
        if (!targetId || !targetType) {
            return res.status(400).json({ msg: "targetId and targetType are required" });
        }

        // Has to actually have a valid target type
        if (!commentServices.isValidTargetType(targetType)) {
            return res.status(400).json({ msg: "targetType must be either 'game' or 'tournament'" });
        }

        // If you're a regular user, you can't see the soft-deleted comments,
        // but admins can
        const filter = commentServices.buildCommentFilter(targetId, targetType, req.user.role);

        const comments = await Comment.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Comment.countDocuments(filter);

        // Enrich comments with usernames
        // Single query to avoid N+1 problem
        const userIds = [...new Set(comments.map(c => c.userId))];
        const users = await User.find(
            { userId: { $in: userIds } },
            { userId: 1, username: 1, avatar: 1 }
        );
        const userMap = new Map(users.map(u => [u.userId, u]));

        const enrichedComments = comments.map(c => ({
            ...c.toObject(),
            username: userMap.get(c.userId)?.username ?? "Anonymous",
            avatar: userMap.get(c.userId)?.avatar ?? null
        }));

        res.json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            comments: enrichedComments
        });
    } catch (err) {
        next(err);
    }
}

// GET /api/comments/recent
// Admin only, returns the most recent comments across all games and tournaments
// Used in the comment administration page
export async function getRecentComments(req, res, next) {
    try {
        const { page = PAGE, limit = LIMIT } = req.validData;

        // Admins can see soft-deleted comments too
        const comments = await Comment.find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Comment.countDocuments({});

        res.json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            comments
        });
    } catch (err) {
        next(err);
    }
}

// POST /api/comments
// Registered users only, creates a new comment on a game or tournament
export async function createComment(req, res, next) {
    try {
        // Request body contains
        const { targetId, targetType, content } = req.validData;

        // Check that all required fields are present
        if (!targetId || !targetType || !content) {
            // Bad request
            return res.status(400).json({ msg: "targetId, targetType and content are required" });
        }

        // Has to actually have a valid target type
        if (!commentServices.isValidTargetType(targetType)) {
            // Bad request
            return res.status(400).json({ msg: "targetType must be either 'game' or 'tournament'" });
        }

        // userId comes from the auth middleware, not the request body
        // Prevents users from posting comments as someone else
        const comment = new Comment({
            userId: req.user.userId,
            targetId,
            targetType,
            content
        });

        // Saving the comment
        await comment.save();
        // Created comment successfully
        res.status(201).json(comment);
    } catch(err) {
        if (err.name === "ValidationError") {
            // Bad request
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

// DELETE /api/comments/:id
// Admin only, soft deletes a comment by setting isDeleted to true
export async function deleteComment(req, res, next) {
    try {
        // Finding the comment by the _id
        const comment = await Comment.findById(req.validData.id);

        if (!comment) {
            // Not found
            return res.status(404).json({ msg: "Comment not found" });
        }

        if (comment.isDeleted) {
            // Bad request
            return res.status(400).json({ msg: "Comment is already deleted" });
        }

        // Soft deletes, keeps the record in the db but hides it from regular users
        comment.isDeleted = true;
        // Save new comment status
        await comment.save();

        res.json({ msg: "Comment deleted successfully" });
    } catch (err) {
        next(err);
    }
}

export default {
    getComments,
    getRecentComments,
    createComment,
    deleteComment
};