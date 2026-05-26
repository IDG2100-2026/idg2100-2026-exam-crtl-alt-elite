import { Comment } from "../models/comment.js";
import { User } from "../models/user.js";
import {
    MIN_COMMENT_LENGTH,
    MAX_COMMENT_LENGTH
} from "../config/constants.js";

// Registers all comment-related WebSocket event handlers for a socket
export function registerCommentHandlers(io, socket) {

    // Players joins a comment room for a game or tournament
    // targetType is either "game" or "tournament"
    // targetId is the custom numeric ID of the game or tournament
    socket.on("join_comments", ({ targetType, targetId }) => {
        try {
            // Validate target type
            if (!["game", "tournament"].includes(targetType)) {
                return socket.emit("error", { msg: "targetType must be game or tournament" });
            }

            // Join the comment room for this target
            // Separate from the game room so spectators can see comments
            // without being in the game room
            const room = `comments:${targetType}:${targetId}`;
            socket.join(room);
        } catch (err) {
            console.error("join_comments error:", err.message);
            socket.emit("error", { msg: "Failed to join comment room" });
        }
    });

    // User posts a new comment
    // Saves to database and broadcasts to all users in the comment room
    socket.on("post_comment", async ({ targetType, targetId, content }) => {
        try {
            // Anonymous users cannot post comments
            if (socket.user?.role === "anonymous") {
                return socket.emit("error", { msg: "You must be logged in to comment" });
            }

            // Validate target type
            if (!["game", "tournament"].includes(targetType)) {
                return socket.emit("error", { msg: "targetType must be game or tournament" });
            }

            // Validate content
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

            // save comment to database
            const comment = new Comment({
                userId: socket.user.userId,
                targetType,
                targetId,
                content: content.trim()
            });

            await comment.save();

            // Fetch username and avatar for the broadcast
            // Using projection to avoid fetching the full user document
            const user = await User.findOne(
                { userId: socket.user.userId },
                { username: 1, avatar: 1 }
            );

            // Broadcast the new comment to all users in the room
            // Including the sender so their UI updates consistently
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

    // Admin deletes a comment
    // Soft deletes and broadcasts deletion to all users in the comment room
    socket.on("delete_comment", async ({ commentId, targetType, targetId }) => {
        try {
            // Only admins can delete comments
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

            // Soft delete - keeps the record but hides it from regular users
            comment.isDeleted = true;
            await comment.save();

            // Broadcast deletion to all users in the comment room
            // Frontend removes the comment from the UI without a page reload
            const room = `comments:${targetType}:${targetId}`;
            io.to(room).emit("comment_deleted", { commentId });

        } catch (err) {
            console.error("delete_comment error:", err.message);
            socket.emit("error", { msg: "Failed to delete comment" });
        }
    });
}
