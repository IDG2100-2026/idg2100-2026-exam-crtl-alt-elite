import mongoose from "mongoose";

// Represents one bet action by a player in a round
// Tracks who bet, how much, and what action they took
const betSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },

    // How many points the player put in during this action
    amount: {
        type: Number,
        required: true,
        min: [0, "Bet amount can't be negative"]
    },

    // The action the player took
    // bet - opening bet
    // match - matched the current highest bet
    // raise - increased the current highest bet
    // fold - gave up their bet for this round
    action: {
        type: String,
        enum: ["bet", "match", "raise", "fold"],
        required: true
    }
});

/* Round sub-schema */
// Represents one round (step/phase) of a game
export const roundSchema = new mongoose.Schema({
    // Which round number this is, starting from 1
    roundNumber: {
        type: Number,
        required: true,
        min: 1
    },

    // The dice values rolled in this round (5 poker dice: 7, 8, J, Q, K, A)
    // Only the backend knows all players' rolls until reveal
    rolls: {
        type: [String],
        validate: {
            validator: (arr) => arr.every(die => ["7", "8", "J", "Q", "K", "A"].includes(die)),
            message: "Dice values must be valid poker faces (7, 8, J, Q, K, A)"
        }
    },

    // Which die were held (by index 0-4)
    holds: {
        type: [Number],
        validate: {
            validator: (arr) => arr.every(i => i >= 0 && i <= 4),
            message: "Held dice must have an index between 0 and 4"
        }
    },

    // All bet actions taken by this player in this round
    bets: [betSchema],

    // Whether this player folded in this round
    // Folded players sit out the rest of this round but return next round
    // Already bet points are not returned when folding
    folded: {
        type: Boolean,
        default: false
    },

    // Whether this player's rolls are revealed to other players
    // False during the round, true after reveal phase
    revealed: {
        type: Boolean,
        default: false
    },

    // Timestamp of when this round was played
    playedAt: {
        type: Date,
        default: Date.now
    }
});