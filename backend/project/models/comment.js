import mongoose from "mongoose";

import {
    MIN_COMMENT_LENGTH,
    MAX_COMMENT_LENGTH
} from "../config/constants.js";

const commentSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },

    targetType: {
        type: String,
        enum: ["game", "tournament"],
        required: true
    },

    targetId: {
        type: Number,
        required: true
    },

    content: {
        type: String,
        required: true,
        trim: true,
        minLength: [MIN_COMMENT_LENGTH, `Comment can't be shorter than ${MIN_COMMENT_LENGTH} characters`],
        maxLength: [MAX_COMMENT_LENGTH, `Comment can't be longer than ${MAX_COMMENT_LENGTH} characters`]
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
},

{
    timestamps: true
});

export const Comment = mongoose.model("Comment", commentSchema);
