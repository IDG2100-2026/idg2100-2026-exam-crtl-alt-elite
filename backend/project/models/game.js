import mongoose from "mongoose";
import { playerSchema } from "./subSchemas/player.js";

import {
    MIN_ID
} from "../config/constants.js";

const gameSchema = new mongoose.Schema({
    // Custom game ID, auto-generated in pre("validate") hook
    gameId: {
        type: Number,
        min: MIN_ID,
        max: Number.MAX_SAFE_INTEGER,
        index: true,
        required: true,
        unique: true
    },

    // Array of players in the game, between 2 and 5
    // Each player entry tracks their state throughout the game
    players: {
        type: [playerSchema],
        validate: {
            validator: function(arr) {
                // Room games can have 1 player while waiting for others to join
                // Ongoing and finished games must have between 2 and 5 players
                if (this.status === "room") {
                    return arr.length >= 1 && arr.length <= 5;
                }
                return arr.length >= 2 && arr.length <= 5;
            },
            message: "A game must have between 2 and 5 players"
        }
    },

    // References the GameVariant model to know the rules of this game
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameVariant",
        required: true
    },

    // Total points currently in the pot
    // Increases as players bet, won by the round winner
    pot: {
        type: Number,
        default: 0,
        min: [0, "Pot can't be negative"]
    },

    // Current status of the game
    // room - waiting for players to join
    // ongoing - game is in progress
    // finished - game has ended
    // cancelled - game was cancelled before it started
    status: {
        type: String,
        enum: ["room", "ongoing", "finished", "cancelled"],
        default: "room"
    },

    // Which round the game is currently on, starting from 1
    currentRound: {
        type: Number,
        default: 1,
        min: 1
    },

    // Current phase within the round
    // rolling - players are rolling and holding dice
    // betting - players are betting, matching, raising or folding
    // reveal - dice are revealed and round winner is determined
    currentPhase: {
        type: String,
        enum: ["rolling", "betting", "reveal"],
        default: "rolling"
    },

    // userId of the player whose rolling turn it currently is
    // null when not in rolling phase
    currentTurnUserId: {
        type: Number,
        default: null
    },

    // How many rolls the current player has used this turn (max 3)
    rollsUsed: {
        type: Number,
        default: 0,
        min: 0
    },

    // userId of the winner, null until the game is finished
    // Array to handle draws between multiple players
    winnerId: {
        type: [Number],
        default: []
    },

    // Whether this game is part of a tournament
    // null for regular games
    tournamentId: {
        type: Number,
        default: null
    },

    // When the game got started
    startedAt: {
        type: Date,
        default: null
    },

    // When the game got finished
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
        // Used to keep track of the version of a document and helps with concurrent updates
        // Stops it from showing up in the JSON response sent to the frontend
        versionKey: false
    }
});

// Modified the code from inclass to fit the game schema, IDG2100 Fullstack 2026
// Checks if the gameId is modified, new or not undefined, and generates a new one or leaves if be
gameSchema.pre("validate", function() {
    if(this.isModified("gameId") || this.isNew) { 
        if(this.gameId !== undefined) {
            console.warn("Game IDs are supposed to be auto generated. Discarding the past value", this.gameId, ".");
        }
        this.gameId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
    }
});

export const Game = mongoose.model("Game", gameSchema);