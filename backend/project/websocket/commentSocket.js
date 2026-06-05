import { Comment } from "../models/comment.js";
import { User } from "../models/user.js";
import {
    MIN_COMMENT_LENGTH,
    MAX_COMMENT_LENGTH
} from "../config/constants.js";

export function registerCommentHandlers(io, socket) {

    socket.on("join_comments", ({ targetType, targetId }) => {
        try {
            if (!["game", "tournament"].includes(targetType)) {
                return socket.emit("error", { msg: "targetType must be game or tournament" });
            }

            const room = `comments:${targetType}:${targetId}`;
            socket.join(room);
        } catch (err) {
            console.error("join_comments error:", err.message);
            socket.emit("error", { msg: "Failed to join comment room" });
        }
    });

    socket.on("post_comment", async ({ targetType, targetId, content }) => {
        try {
            if (socket.user?.role === "anonymous") {
                return socket.emit("error", { msg: "You must be logged in to comment" });
            }

            if (!["game", "tournament"].includes(targetType)) {
                return socket.emit("error", { msg: "targetType must be game or tournament" });
            }

            if (!content || content.trim().length < MIN_COMMENT_LENGTH) {
                return socket.emit("error", {
                    msg: `Comment must be at least ${MIN_COMMENT_LENGTH} characters`
                });
            }

            if (content.trim().length > MAX_COMMENT_LENGTH) {
                return socket.emit("error", {
                    msg: `Comment can't be longer than ${MAX_COMMENT_LENGTH} characters`
                });
            }

            const comment = new Comment({
                userId: socket.user.userId,
                targetType,
                targetId,
                content: content.trim()
            });

            await comment.save();

            const user = await User.findOne(
                { userId: socket.user.userId },
                { username: 1, avatar: 1 }
            );

            const room = `comments:${targetType}:${targetId}`;
            io.to(room).emit("new_comment", {
                commentId: comment._id,
                userId: socket.user.userId,
                username: user?.username,
                avatar: user?.avatar,
                targetType,
                targetId,
                content: comment.content,
                createdAt: comment.createdAt
            });
        } catch (err) {
            console.error("post_comment error:", err.message);
            socket.emit("error", { msg: "Failed to post comment" });
        }
    });

    socket.on("delete_comment", async ({ commentId, targetType, targetId }) => {
        try {
            if (socket.user?.role !== "admin") {
                return socket.emit("error", { msg: "You must be an admin to delete comments" });
            }

            const comment = await Comment.findById(commentId);

            if (!comment) {
                return socket.emit("error", { msg: "Comment not found" });
            }

            if (comment.isDeleted) {
                return socket.emit("error", { msg: "Comment is already deleted" });
            }

            comment.isDeleted = true;
            await comment.save();

            const room = `comments:${targetType}:${targetId}`;
            io.to(room).emit("comment_deleted", { commentId });

        } catch (err) {
            console.error("delete_comment error:", err.message);
            socket.emit("error", { msg: "Failed to delete comment" });
        }
    });
}
