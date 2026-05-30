import mongoose from "mongoose";

import {
    MIN_ROUNDS,
    MIDRANGE_ROUNDS,
    MAX_ROUNDS,
    MIN_TIME,
    MIDRANGE_TIME,
    MAX_TIME,
    MIN_PLAYERS_PER_GAME,
    MID_PLAYERS_PER_GAME,
    MAX_PLAYERS_PER_GAME,
    MIN_BUYIN,
    MID_BUYIN,
    MAX_BUYIN
} from "../config/constants.js";

// Schema for the 162 different game variants
// 3 round options x 2 straights options x 3 time options x 3 player options x 3 buy-in options
const gameVariantSchema = new mongoose.Schema({
    // Number of rounds in a game
    rounds: {
        type: Number,
        enum: [MIN_ROUNDS, MIDRANGE_ROUNDS, MAX_ROUNDS],
        required: true
    },

    // whether straights are included or not
    straightsAllowed: {
        type: Boolean,
        required: true
    },

    // Total seconds allowed for all rounds combined
    // Changed from per-round time to total game time
    timeControl: {
        type: Number,
        enum: [MIN_TIME, MIDRANGE_TIME, MAX_TIME],
        required: true
    },

    // Number of players required to start the game (2, 3, or 5)
    numPlayers: {
        type: Number,
        enum: [MIN_PLAYERS_PER_GAME, MID_PLAYERS_PER_GAME, MAX_PLAYERS_PER_GAME],
        required: true
    },

    // Points required to join a game with this variant (1, 10, or 50)
    buyIn: {
        type: Number,
        enum: [MIN_BUYIN, MID_BUYIN, MAX_BUYIN],
        required: true
    }
},
{
    versionKey: false
});

export const GameVariant = mongoose.model("GameVariant", gameVariantSchema);