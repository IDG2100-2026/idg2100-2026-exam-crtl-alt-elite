import { User } from "../models/user.js";
import { Game } from "../models/game.js";

import {
    ELO_K_FACTOR,
    RECENT_GAMES
} from "../config/constants.js";

/* ELO calculation helper */
// Calculates the new ELO rating for a player after a game
// Based on the standard ELO formula used in chess
// Formula reference: https://en.wikipedia.org/wiki/Elo_rating_system#Mathematical_details 
// actualScore: 1 for win, 0 for loss, 0.5 for draw
export function calculateNewELO(playerElo, opponentElo, actualScore) {
    // Expected score based on the difference in ELO ratings
    const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

    return Math.round(playerElo + ELO_K_FACTOR * (actualScore - expected));
}

/* Multi-player ELO update helper */
// Adapts the standard two-player ELO algorithm for 2-5 players
// Each player is compared against every other player as a pair
// A player "wins" pairings against those with fewer final points
// A player "loses" pairings against those with more final points
// A player "draws" pairings against those with equal final points
export async function updateELORatings(players, gameMongoId) {
    // Fetch all player documents
    const userDocs = await Promise.all(
        players.map(p => User.findOne({ userId: p.userId }))
    );

    // Filter out any users that no longer exist
    const validUsers = userDocs.filter(Boolean);

    // Run ELO calculation for each pair of players
    // Store the ELO deltas seperately to avoid order-dependent results
    const eloDeltas = new Map(validUsers.map(u => [u.userId, 0]));

    // compares all pairings
    for (let i = 0; i < validUsers.length; i++) {
        // Makes sure a player is never compared to themselves
        for (let j = i + 1; j < validUsers.length; j++) {
            const userA = validUsers[i];
            const userB = validUsers[j];

            // Find final points for each player 
            const playerA = players.find(p => p.userId === userA.userId);
            const playerB = players.find(p => p.userId === userB.userId);

            // Determine actual scores for this pairing
            let scoreA, scoreB;
            if (playerA.finalPoints > playerB.finalPoints) {
                scoreA = 1;
                scoreB = 0;
            } else if (playerA.finalPoints < playerB.finalPoints) {
                scoreA = 0;
                scoreB = 1;
            } else {
                scoreA = 0.5;
                scoreB = 0.5;
            }

            // Calculate new ELO for each player in this pairing
            const newEloA = calculateNewELO(userA.eloRating, userB.eloRating, scoreA);
            const newEloB = calculateNewELO(userB.eloRating, userA.eloRating, scoreB);

            // Accumulate the deltas
            eloDeltas.set(userA.userId, eloDeltas.get(userA.userId) + (newEloA - userA.eloRating));
            eloDeltas.set(userB.userId, eloDeltas.get(userB.userId) + (newEloB - userB.eloRating));
        }
    }

    // Apply all ELO changes and update recent games
    await Promise.all(
        validUsers.map(async user => {
            const delta = eloDeltas.get(user.userId);
            const newElo = Math.max(0, user.eloRating + delta); // ELO can't go below 0

            // Add game to recent games, keep only the latest entries
            const recentGames = [gameMongoId, ...user.recentGames].slice(0, RECENT_GAMES);

            await User.updateOne(
                {
                    userId: user.userId
                },
                {
                    eloRating: newElo,
                    recentGames
                }
            );
        })
    );
}

/* Return points to profiles helper */
// After a game ends, each player's remaining stack is returned to their profile
// Called after the final round is resolved
export async function returnPointsToProfiles(players) {
    await Promise.all(
        players.map(player =>
            User.updateOne(
                { userId: player.userId },
                { $inc: { points: player.finalPoints ?? player.points } }
            )
        )
    );
}

/* Winner determination helper */
// Returns the userId of the winner, or null for a draw
export function determineWinners(players) {
    const maxPoints = Math.max(...players.map(p => p.finalPoints ?? p.points));
    return players
        .filter(p => (p.finalPoints ?? p.points) === maxPoints)
        .map(p => p.userId);
}

/* Create room helper */
// Creates a new game room with the first player already joined
export async function createRoom({ variantId, userId, buyIn }) {
    const game = new Game({
        variantId,
        players: [{
            userId,
            points: buyIn,
            currentBet: 0,
            abandoned: false,
            rounds: []
        }],
        pot: 0,
        status: "room"
    });

    await game.save();
    return game;
}

/* Roll dice helper */
// Generates 5 random dice values between 1 and 6
// Called by the WebSocket handler when a round starts
// Rolls are generated on the backend, never the frontend
export function rollDice() {
    return Array.from(
        { length: 5 },
        () => Math.floor(Math.random() * 6) + 1
    );
}

/* Filter rolls helper */
// Filters out unrevealed rolls from other players
// Each player can only see their own rolls until the reveal phase
// Spectators see no rolls until reveal
export function filterRollsForUser(players, requestingUserId) {
    return players.map(player => {
        // The requesting player can always see their own rolls
        if (player.userId === requestingUserId) return player;

        // For other players, hide rolls that haven't been revealed yet
        return {
            ...player,
            rounds: player.rounds.map(round => ({
                ...round,
                // Hide rolls if not yet revealed
                rolls: round.revealed ? round.rolls : [],
                // Hide holds too because they would reveal info about the rolls
                holds: round.revealed ? round.holds : []
            }))
        };
    });
}

/* Enrich game with user info helper */
// Enriches a plain game object with username and ELO from the User model
// Used when returning games from the API so the frontend can display player info
export async function enrichGameWithUserInfo(game) {
    if (!game.players || game.players.length === 0) return game;

    const userIds = game.players.map(p => p.userId).filter(Boolean);
    const users = await User.find(
        { userId: { $in: userIds } }, // filter, which documents to find
        { userId: 1, username: 1, eloRating: 1 } // projection, which fields to return
    );

    // Build a lookup map for efficiency
    const userMap = new Map(users.map(u => [u.userId, u]));

    game.players = game.players.map(player => {
        const user = userMap.get(player.userId);
        if (!user) return player;
        return {
            ...player,
            username: user.username,
            eloRating: user.eloRating
        };
    });

    return game;
}

export default {
    calculateNewELO,
    updateELORatings,
    returnPointsToProfiles,
    determineWinners,
    createRoom,
    rollDice,
    filterRollsForUser,
    enrichGameWithUserInfo
};