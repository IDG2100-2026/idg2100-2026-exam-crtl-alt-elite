import { Game } from "../models/game.js";
import { handleRoundEnd } from "../websocket/handlers/roundHandler.js";

// Per-turn timers (rolling phase): one per active game
const turnTimers = new Map();

// Per-round betting timers: one per active game
const bettingTimers = new Map();

// Starts a countdown for the current player's turn
// When it fires, ends the turn (moves to next player or starts betting)
// Uses dynamic import to avoid circular dependency with rollHandler
export function startTurnTimer(io, game, timeMs) {
    const gameId = game.gameId;
    clearTurnTimer(gameId);

    const timer = setTimeout(async () => {
        turnTimers.delete(gameId);
        try {
            const { endTurn } = await import("../websocket/handlers/rollHandler.js");
            await endTurn(io, gameId);
        } catch (err) {
            console.error("Turn timer error:", err.message);
        }
    }, timeMs);

    turnTimers.set(gameId, timer);
}

export function clearTurnTimer(gameId) {
    if (turnTimers.has(gameId)) {
        clearTimeout(turnTimers.get(gameId));
        turnTimers.delete(gameId);
    }
}

// Starts the betting phase timer
// When it fires, ends the round (forces unfinished bets to close)
export function startBettingTimer(io, game) {
    const gameId = game.gameId;
    const timeMs = (game.variantId?.timeControl || 30) * 1000;
    clearBettingTimer(gameId);

    const timer = setTimeout(async () => {
        bettingTimers.delete(gameId);
        try {
            const g = await Game.findOne({ gameId }).populate("variantId");
            if (g && g.status === "ongoing" && g.currentPhase === "betting") {
                await handleRoundEnd(io, g);
            }
        } catch (err) {
            console.error("Betting timer error:", err.message);
        }
    }, timeMs);

    bettingTimers.set(gameId, timer);
}

export function clearBettingTimer(gameId) {
    if (bettingTimers.has(gameId)) {
        clearTimeout(bettingTimers.get(gameId));
        bettingTimers.delete(gameId);
    }
}

// Backward-compat aliases used by betHandler.js
export const startRoundTimer = startBettingTimer;
export const clearRoundTimer = clearBettingTimer;
