import mongoose from "mongoose";
import { playerSchema } from "./subSchemas/player.js";

import {
    MIN_ID
} from "../config/constants.js";

const gameSchema = new mongoose.Schema({
    gameId: {
        type: Number,
        min: MIN_ID,
        max: Number.MAX_SAFE_INTEGER,
        index: true,
        required: true,
        unique: true
    },

    players: {
        type: [playerSchema],
        validate: {
            validator: function(arr) {
                if (this.status === "room") {
                    return arr.length >= 1 && arr.length <= 5;
                }
                return arr.length >= 2 && arr.length <= 5;
            },
            message: "A game must have between 2 and 5 players"
        }
    },

    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameVariant",
        required: true
    },

    pot: {
        type: Number,
        default: 0,
        min: [0, "Pot can't be negative"]
    },

    status: {
        type: String,
        enum: ["room", "ongoing", "finished", "cancelled"],
        default: "room"
    },

    currentRound: {
        type: Number,
        default: 1,
        min: 1
    },

    currentPhase: {
        type: String,
        enum: ["rolling", "betting", "reveal"],
        default: "rolling"
    },

    currentTurnUserId: {
        type: Number,
        default: null
    },

    rollsUsed: {
        type: Number,
        default: 0,
        min: 0
    },

    winnerId: {
        type: [Number],
        default: []
    },

    tournamentId: {
        type: Number,
        default: null
    },

    startedAt: {
        type: Date,
        default: null
    },

    finishedAt: {
        type: Date,
        default: null
    }
},
{
    timestamps: true,
    toJSON: {
        transform: (gameDoc, gamePojo) => {
            delete gamePojo._id;
            return gamePojo;
        },
        versionKey: false
    }
});

gameSchema.pre("validate", function() {
    if(this.isModified("gameId") || this.isNew) {
        if(this.gameId !== undefined) {
            console.warn("Game IDs are supposed to be auto generated. Discarding the past value", this.gameId, ".");
        }
        this.gameId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
    }
});

export const Game = mongoose.model("Game", gameSchema);
