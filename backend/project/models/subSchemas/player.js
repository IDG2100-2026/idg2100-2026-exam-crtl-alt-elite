import mongoose from "mongoose";
import { roundSchema } from "./round.js";

export const playerSchema = mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },

    points: {
        type: Number,
        required: true,
        min: [0, "Points can't be negative"]
    },

    currentBet: {
        type: Number,
        default: 0,
        min: [0, "Bet can't be negative"]
    },

    abandoned: {
        type: Boolean,
        default: false
    },

    rounds: [roundSchema],

    finalPoints: {
        type: Number,
        default: null
    }
});
