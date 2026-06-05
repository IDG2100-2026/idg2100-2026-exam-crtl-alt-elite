import mongoose from "mongoose";

export const matchSchema = new mongoose.Schema({
    playerOne: {
        type: Number,
        required: true
    },
    playerTwo: {
        type: Number,
        required: true
    },

    gameId: {
        type: Number
    },

    round: {
        type: Number,
        required: true
    },

    winnerId: {
        type: Number,
        default: null
    }
});
