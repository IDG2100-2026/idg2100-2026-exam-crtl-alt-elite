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

const gameVariantSchema = new mongoose.Schema({
    rounds: {
        type: Number,
        enum: [MIN_ROUNDS, MIDRANGE_ROUNDS, MAX_ROUNDS],
        required: true
    },

    straightsAllowed: {
        type: Boolean,
        required: true
    },

    timeControl: {
        type: Number,
        enum: [MIN_TIME, MIDRANGE_TIME, MAX_TIME],
        required: true
    },

    numPlayers: {
        type: Number,
        enum: [MIN_PLAYERS_PER_GAME, MID_PLAYERS_PER_GAME, MAX_PLAYERS_PER_GAME],
        required: true
    },

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
