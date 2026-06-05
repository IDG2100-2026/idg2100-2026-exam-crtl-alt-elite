import mongoose from "mongoose";

const betSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },

    amount: {
        type: Number,
        required: true,
        min: [0, "Bet amount can't be negative"]
    },

    action: {
        type: String,
        enum: ["bet", "match", "raise", "fold"],
        required: true
    }
});

export const roundSchema = new mongoose.Schema({
    roundNumber: {
        type: Number,
        required: true,
        min: 1
    },

    rolls: {
        type: [String],
        validate: {
            validator: (arr) => arr.every(die => ["7", "8", "J", "Q", "K", "A"].includes(die)),
            message: "Dice values must be valid poker faces (7, 8, J, Q, K, A)"
        }
    },

    holds: {
        type: [Number],
        validate: {
            validator: (arr) => arr.every(i => i >= 0 && i <= 4),
            message: "Held dice must have an index between 0 and 4"
        }
    },

    bets: [betSchema],

    folded: {
        type: Boolean,
        default: false
    },

    revealed: {
        type: Boolean,
        default: false
    },

    playedAt: {
        type: Date,
        default: Date.now
    }
});
