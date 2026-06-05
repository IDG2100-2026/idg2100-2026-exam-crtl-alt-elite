import { Comment } from "../models/comment.js";
import { User } from "../models/user.js";
import commentServices from "../services/comment.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

export async function getComments(req, res, next) {
    try {
        const { targetId, targetType, page = PAGE, limit = LIMIT } = req.validData;

        if (!targetId || !targetType) {
            return res.status(400).json({ msg: "targetId and targetType are required" });
        }

        if (!commentServices.isValidTargetType(targetType)) {
            return res.status(400).json({ msg: "targetType must be either 'game' or 'tournament'" });
        }

        const filter = commentServices.buildCommentFilter(targetId, targetType, req.user.role);

        const comments = await Comment.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Comment.countDocuments(filter);

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

export async function getRecentComments(req, res, next) {
    try {
        const { page = PAGE, limit = LIMIT } = req.validData;

        const comments = await Comment.find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Comment.countDocuments({});

        const userIds = [...new Set(comments.map(c => c.userId))];
        const users = await User.find(
            { userId: { $in: userIds } },
            { userId: 1, username: 1 }
        );
        const userMap = new Map(users.map(u => [u.userId, u]));

        const enrichedComments = comments.map(c => ({
            ...c.toObject(),
            username: userMap.get(c.userId)?.username ?? "Anonymous"
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

export async function createComment(req, res, next) {
    try {
        const { targetId, targetType, content } = req.validData;

        if (!targetId || !targetType || !content) {
            return res.status(400).json({ msg: "targetId, targetType and content are required" });
        }

        if (!commentServices.isValidTargetType(targetType)) {
            return res.status(400).json({ msg: "targetType must be either 'game' or 'tournament'" });
        }

        const comment = new Comment({
            userId: req.user.userId,
            targetId,
            targetType,
            content
        });

        await comment.save();
        res.status(201).json(comment);
    } catch(err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

export async function deleteComment(req, res, next) {
    try {
        const comment = await Comment.findById(req.validData.id);

        if (!comment) {
            return res.status(404).json({ msg: "Comment not found" });
        }

        if (comment.isDeleted) {
            return res.status(400).json({ msg: "Comment is already deleted" });
        }

        comment.isDeleted = true;
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
