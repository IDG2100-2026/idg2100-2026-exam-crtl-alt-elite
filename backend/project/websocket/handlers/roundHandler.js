import { Game } from "../../models/game.js";
import { handleRoll } from "./rollHandler.js";
import {
    determineWinners,
    returnPointsToProfiles,
    updateELORatings
} from "../../services/game.services.js";

// Handles the end of a betting phase
// Reveals all dice, determines round winner, starts next round or ends game
export async function handleRoundEnd(io, game) {
    const gameId = game.gameId;

    // Reveal all players' dice
    for (const player of game.players) {
        const currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);
        if (currentRound) {
            currentRound.revealed = true;
        }
    }

    game.currentPhase = "reveal";
    await game.save();

    // Build reveal data, all rolls are now visible
    const revealData = game.players.map(player => {
        const currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);
        return {
            userId: player.userId,
            rolls: currentRound?.rolls || [],
            holds: currentRound?.holds || [],
            folded: currentRound?.folded || false
        };
    });

    // Determine round winner based on poker dice hand rankings
    // Winner collects the pot
    const roundWinners = determineRoundWinners(game);

    // Split pot evenly among winners (handles draws)
    const splitAmount = Math.floor(game.pot / roundWinners.length);
    for (const winnerId of roundWinners) {
        const winner = game.players.find(p => p.userId === winnerId);
        if (winner) winner.points += splitAmount;
    }

    // Reset pot and current bets for next round
    game.pot = 0;
    for (const player of game.players) {
        player.currentBet = 0;
    }

    game.markModified("players");
    await game.save();

    // Broadcast reveal to all players including updated points
    io.to(`game:${gameId}`).emit("round_end", {
        roundNumber: game.currentRound,
        reveal: revealData,
        roundWinners,
        pot: splitAmount,
        players: game.players.map(p => ({ userId: p.userId, points: p.points }))
    });

    // Check if the game is over
    const totalRounds = game.variantId?.rounds || 3;
    if (game.currentRound >= totalRounds) {
        await handleGameEnd(io, game);
    } else {
        // Start the next round after a short delay
        game.currentRound += 1;
        game.currentPhase = "rolling";
        await game.save();

        // Small delay before starting next round so players can see reveal results
        setTimeout(async () => {
            const updatedGame = await Game.findOne({ gameId })
                .populate("variantId");
            await handleRoll(io, updatedGame);
        }, 3000); // 3 second delay between rounds
    }
}

// Determines the winner(s) of a round based on poker dice hand rankings
// Returns an array of userIds
function determineRoundWinners(game) {
    const activePlayers = game.players.filter(player => {
        const round = player.rounds.find(r => r.roundNumber === game.currentRound);
        return !round?.folded && !player.abandoned;
    });

    // If all players folded except one, that player wins
    if (activePlayers.length === 1) {
        return [activePlayers[0].userId];
    }

    // If all players folded, pot stays — give it to the last folder as a fallback
    if (activePlayers.length === 0) {
        return [game.players[0].userId];
    }

    // Rank each active player's hand
    const ranked = activePlayers.map(player => {
        const round = player.rounds.find(r => r.roundNumber === game.currentRound);
        return {
            userId: player.userId,
            score: evaluateHand(round?.rolls || [])
        };
    });

    // Sort by score descending
    ranked.sort((a, b) => b.score - a.score);

    // Return all players tied for the highest score
    const highestScore = ranked[0].score;
    return ranked
        .filter(p => p.score === highestScore)
        .map(p => p.userId);
}

// Handles the end of the entire game
// Returns points to profiles, updates ELO, records winner
async function handleGameEnd(io, game) {
    const gameId = game.gameId;

    // Set final points for each player
    for (const player of game.players) {
        player.finalPoints = player.points;
    }

    // Determine overall game winners based on final point stacks
    game.winnerId = determineWinners(game.players);
    game.status = "finished";
    game.finishedAt = new Date();
    await game.save();

    // Return remaining points to user profiles
    await returnPointsToProfiles(game.players);

    // Update ELO ratings for all players
    await updateELORatings(game.players, game._id);

    // Broadcast game end to all players
    io.to(`game:${gameId}`).emit("game_end", {
        winnerId: game.winnerId,
        players: game.players.map(p => ({
            userId: p.userId,
            finalPoints: p.finalPoints
        }))
    });
}

// Evaluates a poker dice hand and returns a numeric score
// Higher score = better hand
// Hand rankings (high to low):
// Five of a kind, Four of a kind, Full house,
// Straight, Three of a kind, Two pair, One pair, High card
export function evaluateHand(dice) {
    if (!dice || dice.length !== 5) return 0;

    // Count occurrences of each die value
    const counts = {};
    for (const die of dice) {
        counts[die] = (counts[die] || 0) + 1;
    }

    const values = Object.values(counts).sort((a, b) => b - a);
    const sorted = [...dice].sort((a, b) => a - b);

    // Hand type score (0-7) shifted up to leave room for tiebreaker
    // Multiply by 1000 so tiebreaker values (max ~776) never overlap hand types
    let handScore;

    // Five of a kind
    if (values[0] === 5) handScore = 7;
    // Four of a kind
    else if (values[0] === 4) handScore = 6;
    // Full house (three of a kind + pair)
    else if (values[0] === 3 && values[1] === 2) handScore = 5;
    // Straight (1-2-3-4-5 or 2-3-4-5-6)
    else if (sorted.every((val, i) => i === 0 || val === sorted[i - 1] + 1)) handScore = 4;
    // Three of a kind
    else if (values[0] === 3) handScore = 3;
    // Two pair
    else if (values[0] === 2 && values[1] === 2) handScore = 2;
    // One pair
    else if (values[0] === 2) handScore = 1;
    // High card
    else handScore = 0;

    // Tiebreaker: encode dice values sorted by frequency then by face value
    // e.g. pair of 6s + 5,3,1 beats pair of 5s + 6,4,2
    const tiebreaker = Object.entries(counts)
        .map(([face, count]) => ({ face: Number(face), count }))
        .sort((a, b) => b.count - a.count || b.face - a.face) // sort by count desc, then face desc
        .reduce((acc, { face }, i) => acc + face * Math.pow(10, (4 - i)), 0);

    return handScore * 1000000 + tiebreaker;
}