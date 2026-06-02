import { Game } from "../../models/game.js";
import { rollDice } from "../../services/game.services.js";
import { startTurnTimer, clearTurnTimer, startBettingTimer } from "../../utils/gameTimer.js";

export const ROLLS_PER_TURN = 3;

// Entry point: starts the rolling phase for the current round
// Sets the first player's turn and waits for them to click Roll
export async function handleRoll(io, game) {
    game.currentPhase = "rolling";
    game.rollsUsed = 0;

    const firstPlayer = game.players.find(p => !p.abandoned);
    if (!firstPlayer) return;

    game.currentTurnUserId = firstPlayer.userId;
    await game.save();

    const timeMs = (game.variantId?.timeControl || 30) * 1000;
    const expiresAt = Date.now() + timeMs;

    io.to(`game:${game.gameId}`).emit("round_start", {
        roundNumber: game.currentRound,
        phase: "rolling",
        currentTurnUserId: firstPlayer.userId,
        expiresAt
    });

    startTurnTimer(io, game, timeMs);
}

// Performs one roll for the current player
// holds: indices of dice to keep from the previous roll (empty = roll all 5)
export async function doRoll(io, game, holds) {
    clearTurnTimer(game.gameId);

    const player = game.players.find(p => p.userId === game.currentTurnUserId);
    if (!player) return;

    let currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);

    let newRolls;
    if (!currentRound || !currentRound.rolls.length || game.rollsUsed === 0) {
        // First roll of this turn — roll all 5 dice
        newRolls = rollDice();
    } else {
        // Re-roll: keep held dice, randomise the rest
        newRolls = currentRound.rolls.map((val, i) =>
            holds.includes(i) ? val : Math.floor(Math.random() * 6) + 1
        );
    }

    if (!currentRound) {
        player.rounds.push({
            roundNumber: game.currentRound,
            rolls: newRolls,
            holds,
            revealed: false,
            folded: false,
            bets: []
        });
    } else {
        currentRound.rolls = newRolls;
        currentRound.holds = holds;
    }

    game.rollsUsed = (game.rollsUsed || 0) + 1;
    game.markModified("players");
    await game.save();

    const timeMs = (game.variantId?.timeControl || 30) * 1000;
    const expiresAt = Date.now() + timeMs;

    // Send dice only to the current player
    const sockets = await io.in(`game:${game.gameId}`).fetchSockets();
    const playerSocket = sockets.find(s => s.user?.userId === game.currentTurnUserId);
    if (playerSocket) {
        playerSocket.emit("roll_result", {
            roundNumber: game.currentRound,
            rolls: newRolls,
            holds,
            rollsUsed: game.rollsUsed,
            rollsTotal: ROLLS_PER_TURN
        });
    }

    // Broadcast turn state to everyone (no dice values)
    io.to(`game:${game.gameId}`).emit("turn_update", {
        currentTurnUserId: game.currentTurnUserId,
        rollsUsed: game.rollsUsed,
        rollsTotal: ROLLS_PER_TURN,
        roundNumber: game.currentRound,
        expiresAt
    });

    if (game.rollsUsed >= ROLLS_PER_TURN) {
        // All 3 rolls used — auto-end turn after a pause so player can see their final dice
        clearTurnTimer(game.gameId);
        setTimeout(() => endTurn(io, game.gameId), 2500);
    } else {
        startTurnTimer(io, game, timeMs);
    }
}

// Handles a re-roll request from the current player
export async function handleReRoll(io, socket, gameId, holds) {
    const game = await Game.findOne({ gameId: Number(gameId) }).populate("variantId");

    if (!game || game.status !== "ongoing") return socket.emit("error", { msg: "Game not active" });
    if (game.currentPhase !== "rolling") return socket.emit("error", { msg: "Not the rolling phase" });
    if (game.currentTurnUserId !== socket.user.userId) return socket.emit("error", { msg: "It is not your turn" });
    if (game.rollsUsed >= ROLLS_PER_TURN) return socket.emit("error", { msg: "No rolls remaining" });

    const validHolds = (holds || []).filter(i => i >= 0 && i <= 4);
    await doRoll(io, game, validHolds);
}

// Ends the current player's turn
// Moves to the next player or starts the betting phase when all have rolled
export async function endTurn(io, gameId) {
    const game = await Game.findOne({ gameId: Number(gameId) }).populate("variantId");
    if (!game || game.status !== "ongoing" || game.currentPhase !== "rolling") return;

    clearTurnTimer(gameId);

    // If the current player hasn't rolled at all (timed out), give them a random hand
    const currentPlayer = game.players.find(p => p.userId === game.currentTurnUserId);
    if (currentPlayer) {
        const hasRolled = currentPlayer.rounds.some(
            r => r.roundNumber === game.currentRound && r.rolls?.length > 0
        );
        if (!hasRolled) {
            currentPlayer.rounds.push({
                roundNumber: game.currentRound,
                rolls: rollDice(),
                holds: [],
                revealed: false,
                folded: false,
                bets: []
            });
            game.markModified("players");
            await game.save();
        }
    }

    // Find next player who has not rolled yet this round
    const nextPlayer = game.players.find(p =>
        !p.abandoned &&
        !p.rounds.some(r => r.roundNumber === game.currentRound && r.rolls?.length > 0)
    );

    if (nextPlayer) {
        game.currentTurnUserId = nextPlayer.userId;
        game.rollsUsed = 0;
        await game.save();

        const timeMs = (game.variantId?.timeControl || 30) * 1000;
        const expiresAt = Date.now() + timeMs;

        io.to(`game:${gameId}`).emit("turn_update", {
            currentTurnUserId: nextPlayer.userId,
            rollsUsed: 0,
            rollsTotal: ROLLS_PER_TURN,
            roundNumber: game.currentRound,
            expiresAt
        });

        startTurnTimer(io, game, timeMs);
    } else {
        // All players have rolled — start betting
        game.currentPhase = "betting";
        game.currentTurnUserId = null;
        game.rollsUsed = 0;
        await game.save();
        io.to(`game:${gameId}`).emit("phase_change", { phase: "betting" });
        startBettingTimer(io, game);
    }
}
