import { Game } from "../../models/game.js";
import { rollDice } from "../../services/game.services.js";
import { startRoundTimer } from "../../utils/gameTimer.js";

// Rolls dice for all players at the start of a round
// Called by roundHandler when a new round starts
// Rolls are generated on the backend and sent individually to each player
export async function handleRoll(io, game) {
    const gameId = game.gameId;

    // Roll dice for each active player
    for (const player of game.players) {
        // Abandoned players still get rolls but can't hold
        const rolls = rollDice();

        // Find or create the round entry for this player
        const existingRound = player.rounds.find(r => r.roundNumber === game.currentRound);
        if (existingRound) {
            existingRound.rolls = rolls;
            existingRound.holds = [];
            existingRound.revealed = false;
        } else {
            player.rounds.push({
                roundNumber: game.currentRound,
                rolls,
                holds: [],
                revealed: false,
                folded: false,
                bets: []
            });
        }
    }

    game.currentPhase = "rolling";
    await game.save();

    // Send each player only their own rolls
    // Other players' rolls are hidden until reveal
    const sockets = await io.in(`game:${gameId}`).fetchSockets();
    for (const s of sockets) {
        const player = game.players.find(p => p.userId === s.user?.userId);
        if (!player) continue;

        const currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);
        if (!currentRound) continue;

        s.emit("roll_result", {
            roundNumber: game.currentRound,
            rolls: currentRound.rolls,
            holds: currentRound.holds
        });
    }

    // Broadcast to all that a new round has started
    // Does not include any roll data
    io.to(`game:${gameId}`).emit("round_start", {
        roundNumber: game.currentRound,
        phase: "rolling"
    });

    // Start the round timer after broadcasting
    // If time runs out before all players act, round ends automatically
    startRoundTimer();
}

// Handles a player holding dice
// Validates the holds and broadcasts to all players
// Holds are visible to other players, only the values are hidden
export async function handleHold(io, socket, gameId, holds) {
    const game = await Game.findOne({ gameId: Number(gameId) });

    if (!game || game.status !== "ongoing") {
        return socket.emit("error", { msg: "Game is not ongoing" });
    }

    if (game.currentPhase !== "rolling") {
        return socket.emit("error", { msg: "It is not the rolling phase" });
    }

    const player = game.players.find(p => p.userId === socket.user.userId);
    if (!player) {
        return socket.emit("error", { msg: "You are not a player in this game" });
    }

    if (player.abandoned) {
        return socket.emit("error", { msg: "Abandoned players cannot hold dice" });
    }

    // Validate holds, must be indices 0-4
    const validHolds = holds.filter(i => i >= 0 && i <= 4);

    // Update the player's holds for this round
    const currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);
    if (!currentRound) {
        return socket.emit("error", { msg: "Round not found" });
    }

    currentRound.holds = validHolds;
    await game.save();

    // Broadcast holds to all players
    // Only the indices are shared, not the dice values
    io.to(`game:${gameId}`).emit("holds_update", {
        userId: socket.user.userId,
        roundNumber: game.currentRound,
        holds: validHolds
    });
}