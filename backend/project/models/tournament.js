import mongoose from "mongoose";
import { matchSchema } from "./subSchemas/match.js";

import { 
    MIN_ID,
    MIN_TITLE_LENGTH,
    MAX_TITLE_LENGTH,
    MIN_DESCRIPTION_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    MIN_PLAYERS,
    LOW_RANGE_PLAYERS,
    HIGH_RANGE_PLAYERS,
    MAX_PLAYERS
} from "../config/constants.js";

const tournamentSchema = new mongoose.Schema({
    // Custom tournament ID, auto generated the same way as userId and gameId
    tournamentId: {
        type: Number,
        min: MIN_ID,
        max: Number.MAX_SAFE_INTEGER,
        index: true,
        required: true,
        unique: true
    },

    // Title for the tournament
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: [MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`],
        maxLength: [MAX_TITLE_LENGTH, `Title can't be longer than ${MAX_TITLE_LENGTH} characters`]
    },

    // Description of the tournament
    description: {
        type: String,
        trim: true,
        minLength: [MIN_DESCRIPTION_LENGTH, `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`],
        maxLength: [MAX_DESCRIPTION_LENGTH, `Description can't be longer than ${MAX_DESCRIPTION_LENGTH} characters`]
    },

    // References the trophy awarded to the winner
    trophyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trophy",
        required: true
    },

    // References the game variant used for all games in this tournament
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameVariant",
        required: true
    },

    // The admin who created the tournament
    createdBy: {
        type: Number,
        required: true
    },

    // Maximum number of players per tournament
    maxPlayers: {
        type: Number,
        enum: [MIN_PLAYERS, LOW_RANGE_PLAYERS, HIGH_RANGE_PLAYERS, MAX_PLAYERS],
        required: true
    },

    // Pool of registered users who have joined the tournament
    // Stored as userIds, capped at maxPlayers
    players: {
        type: [Number],
        default: [],
        validate: {
            validator: function(arr) {
                return arr.length <= this.maxPlayers;
            },
            message: "Tournament has reached its maximum number of players"
        }
    },

    // All matches across all tournament rounds
    matches: [matchSchema],

    // Duration of breaks between tournament rounds in minutes
    breakDuration: {
        type: Number,
        default: 0
    },

    // Fixed number of tournament rounds
    // Different from in-game rounds, these are the bracket rounds
    // e.g. round 1: all players paired, round 2: winners paired, etc.
    numRounds: {
        type: Number,
        required: true,
        min: [1, "Tournament must have at least 1 round"]
    },

    // Which tournament round is currently active
    // null until tournament starts
    currentRound: {
        type: Number,
        default: null
    },

    // Optional ELO range restrictions
    // If set, only players within this ELO range can join
    // Both must be provided together or both omitted
    eloMin: {
        type: Number,
        default: null
    },

    eloMax: {
        type: Number,
        default: null
    },

    // When the tournament is scheduled to start
    scheduledAt: {
        type: Date,
        required: true
    },

    // When the tournament actually started
    startedAt: {
        type: Date,
        default: null
    },

    // When the tournament finished
    finishedAt: {
        type: Date,
        default: null
    },

    // Status of the tournament
    // cancelled - admin cancelled it, still visible but can't be joined
    status: {
        type: String,
        enum: ["upcoming", "ongoing", "finished", "cancelled"],
        default: "upcoming"
    },

    // userId of the tournament winner, null until finished
    // Array to handle draws between multiple players
    winnerId: {
        type: [Number],
        default: []
    },

    // Tracks total points accumulated by each player across all tournament games
    // Used to determine tournament standings and winner
    // { userId: Number, points: Number }
    standings: {
        type: [{
            userId: { type: Number, required: true },
            points: { type: Number, default: 0 }
        }],
        default: []
    }
},
{
    timestamps: true,
    toJSON: {
        transform: (tournamentDoc, tournamentPojo) => {
            delete tournamentPojo._id;
            return tournamentPojo;
        },
        versionKey: false
    }
});

// Based off inclass code from IDG2100 Fullstack 2026
tournamentSchema.pre("validate", function() {
    // Auto-generate tournamentId
    if (this.isModified("tournamentId") || this.isNew) {
        if (this.tournamentId !== undefined) {
            console.warn("Tournament IDs are supposed to be auto generated. Discarding the past value", this.tournamentId, ".");
        }
        this.tournamentId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
    }

    // Validate ELO range
    const hasMin = this.eloMin !== null && this.eloMin !== undefined;
    const hasMax = this.eloMax !== null && this.eloMax !== undefined;

    // Validates that eloMin and eloMax are either both set or both omitted
    if (hasMin !== hasMax) {
        this.invalidate("eloMin", "eloMin and eloMax must both be set or both omitted");
    }

    // Validates that eloMin is less than eloMax if both are set
    if (hasMin && hasMax && this.eloMin >= this.eloMax) {
        this.invalidate("eloMin", "eloMin must be less than eloMax");
    }
});

export const Tournament = mongoose.model("Tournament", tournamentSchema);