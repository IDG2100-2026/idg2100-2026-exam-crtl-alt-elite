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
    tournamentId: {
        type: Number,
        min: MIN_ID,
        max: Number.MAX_SAFE_INTEGER,
        index: true,
        required: true,
        unique: true
    },

    title: {
        type: String,
        required: true,
        trim: true,
        minLength: [MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`],
        maxLength: [MAX_TITLE_LENGTH, `Title can't be longer than ${MAX_TITLE_LENGTH} characters`]
    },

    description: {
        type: String,
        trim: true,
        minLength: [MIN_DESCRIPTION_LENGTH, `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`],
        maxLength: [MAX_DESCRIPTION_LENGTH, `Description can't be longer than ${MAX_DESCRIPTION_LENGTH} characters`]
    },

    trophyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trophy",
        required: true
    },

    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameVariant",
        required: true
    },

    createdBy: {
        type: Number,
        required: true
    },

    maxPlayers: {
        type: Number,
        enum: [MIN_PLAYERS, LOW_RANGE_PLAYERS, HIGH_RANGE_PLAYERS, MAX_PLAYERS],
        required: true
    },

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

    matches: [matchSchema],

    breakDuration: {
        type: Number,
        default: 0
    },

    numRounds: {
        type: Number,
        required: true,
        min: [1, "Tournament must have at least 1 round"]
    },

    currentRound: {
        type: Number,
        default: null
    },

    eloMin: {
        type: Number,
        default: null
    },

    eloMax: {
        type: Number,
        default: null
    },

    scheduledAt: {
        type: Date,
        required: true
    },

    startedAt: {
        type: Date,
        default: null
    },

    finishedAt: {
        type: Date,
        default: null
    },

    status: {
        type: String,
        enum: ["upcoming", "ongoing", "finished", "cancelled"],
        default: "upcoming"
    },

    winnerId: {
        type: [Number],
        default: []
    },

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

tournamentSchema.pre("validate", function() {
    if (this.isModified("tournamentId") || this.isNew) {
        if (this.tournamentId !== undefined) {
            console.warn("Tournament IDs are supposed to be auto generated. Discarding the past value", this.tournamentId, ".");
        }
        this.tournamentId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
    }

    const hasMin = this.eloMin !== null && this.eloMin !== undefined;
    const hasMax = this.eloMax !== null && this.eloMax !== undefined;

    if (hasMin !== hasMax) {
        this.invalidate("eloMin", "eloMin and eloMax must both be set or both omitted");
    }

    if (hasMin && hasMax && this.eloMin >= this.eloMax) {
        this.invalidate("eloMin", "eloMin must be less than eloMax");
    }
});

export const Tournament = mongoose.model("Tournament", tournamentSchema);
