import mongoose from "mongoose";
import { roundSchema } from "./round.js";

/* Player sub-schema */
export const playerSchema = mongoose.Schema({
    // References the User model via the custom userId field
    userId: {
        type: Number,
        required: true
    },

    // The player's current point stack during the game
    // Starts equal to the game's buyIn
    // Goes up and down as rounds are won and lost
    // Added back to the user's profile points at game end
    points: {
        type: Number,
        required: true,
        min: [0, "Points can't be negative"]
    },

    // What this player has bet in the current betting phase
    // Reset to 0 at the start of each round
    currentBet: {
        type: Number,
        default: 0,
        min: [0, "Bet can't be negative"]
    },

    // Whether this player has abandoned or timed out
    // Abandoned players have dice rolled for them automatically
    // and always match the current pot amount
    // Permanent for the whole game, unlike folding which is per round
    abandoned: {
        type: Boolean,
        default: false
    },
    
    // Each array entry is one round played by this player
    rounds: [roundSchema],

    // Final points at the end of the game
    // Used to determine ELO changes and tournament standings
    finalPoints: {
        type: Number,
        default: null
    }
});