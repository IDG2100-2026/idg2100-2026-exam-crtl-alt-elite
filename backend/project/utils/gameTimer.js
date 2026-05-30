import { Game } from "../models/game.js";
import { handleRoundEnd } from "../websocket/handlers/roundHandler.js";

// Stores active timers by gameId
// Allows timers to be cleared when a round ends naturally
const activeTimers = new Map();

// Starts the timer for a round
// If the time runs out, abandoned players are auto-matched and round ends
export function startRoundTimer(io, game) {
    const gameId = game.gameId;
    const timeLimit = game.variantId?.timeControl * 1000 || 30000;

    // Clear any existing timer for this game
    clearRoundTimer(gameId);

    const timer = setTimeout(async () => {
        try {
            const currentGame = await Game.findOne({ gameId })
                .populate("variantId");

            if (!currentGame || currentGame.status !== "ongoing") return;

            // Mark players who haven't acted as abandoned
            for (const player of currentGame.players) {
                const currentRound = player.rounds.find(
                    r => r.roundNumber === currentGame.currentRound
                );

                // If no rolls recorded, player timed out
                if (!currentRound || currentRound.rolls.length === 0) {
                    player.abandoned = true;
                }
            }

            await currentGame.save();

            // Force end the round
            await handleRoundEnd(io, currentGame);
        } catch (err) {
            console.error("Round timer error:", err.message);
        } finally {
            activeTimers.delete(gameId);
        }
    }, timeLimit);

    activeTimers.set(gameId, timer);
}

// Clears the timer for a game
// Called when a round ends naturally before time runs out
export function clearRoundTimer(gameId) {
    if (activeTimers.has(gameId)) {
        clearTimeout(activeTimers.get(gameId));
        activeTimers.delete(gameId);
    }
}