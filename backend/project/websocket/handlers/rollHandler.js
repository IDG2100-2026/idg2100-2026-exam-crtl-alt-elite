import { Game } from "../../models/game.js";
import { rollDice } from "../../services/game.services.js";
import { startTurnTimer, clearTurnTimer, startBettingTimer } from "../../utils/gameTimer.js";

export const ROLLS_PER_TURN = 3;

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
        expiresAt,
        players: game.players.map(p => ({ userId: p.userId, points: p.points }))
    });

    startTurnTimer(io, game, timeMs);
}

export async function doRoll(io, game, holds) {
    clearTurnTimer(game.gameId);

    const player = game.players.find(p => p.userId === game.currentTurnUserId);
    if (!player) return;

    let currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);

    let newRolls;
    if (!currentRound || !currentRound.rolls.length || game.rollsUsed === 0) {
        newRolls = rollDice();
    } else {
        const POKER_FACES = ["7", "8", "J", "Q", "K", "A"];
        newRolls = currentRound.rolls.map((val, i) =>
            holds.includes(i) ? val : POKER_FACES[Math.floor(Math.random() * POKER_FACES.length)]
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

    const timeMs = (game.variantId?.timeControl || 30) * 1000;
    const expiresAt = Date.now() + timeMs;

    io.to(`game:${game.gameId}`).emit("turn_update", {
        currentTurnUserId: game.currentTurnUserId,
        rollsUsed: game.rollsUsed,
        rollsTotal: ROLLS_PER_TURN,
        roundNumber: game.currentRound,
        expiresAt
    });

    if (game.rollsUsed >= ROLLS_PER_TURN) {
        clearTurnTimer(game.gameId);
        setTimeout(() => endTurn(io, game.gameId), 2500);
    } else {
        startTurnTimer(io, game, timeMs);
    }
}

export async function handleReRoll(io, socket, gameId, holds) {
    const game = await Game.findOne({ gameId: Number(gameId) }).populate("variantId");

    if (!game || game.status !== "ongoing") return socket.emit("error", { msg: "Game not active" });
    if (game.currentPhase !== "rolling") return socket.emit("error", { msg: "Not the rolling phase" });
    if (game.currentTurnUserId !== socket.user.userId) return socket.emit("error", { msg: "It is not your turn" });

    const rollsUsed = game.rollsUsed ?? 0;
    if (rollsUsed >= ROLLS_PER_TURN) return socket.emit("error", { msg: "No rolls remaining" });

    const validHolds = (holds || []).filter(i => i >= 0 && i <= 4);
    await doRoll(io, game, validHolds);
}

export async function endTurn(io, gameId) {
    const game = await Game.findOne({ gameId: Number(gameId) }).populate("variantId");
    if (!game || game.status !== "ongoing" || game.currentPhase !== "rolling") return;

    clearTurnTimer(gameId);

    console.log("endTurn called for game:", gameId);
    console.log("currentTurnUserId:", game.currentTurnUserId);
    console.log("currentRound:", game.currentRound);
    console.log("players:", game.players.map(p => ({
        userId: p.userId,
        abandoned: p.abandoned,
        rounds: p.rounds.filter(r => r.roundNumber === game.currentRound).map(r => ({
            roundNumber: r.roundNumber,
            rollsLength: r.rolls?.length
        }))
    })));

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

    const nextPlayer = game.players.find(p =>
        !p.abandoned &&
        !p.rounds.some(r => r.roundNumber === game.currentRound && r.rolls?.length > 0)
    );

    if (nextPlayer) {
        game.currentTurnUserId = nextPlayer.userId;
        game.rollsUsed = 0;
        game.markModified("players");
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
        game.currentPhase = "betting";
        game.currentTurnUserId = null;
        game.rollsUsed = 0;
        await game.save();
        io.to(`game:${gameId}`).emit("phase_change", { phase: "betting" });
        startBettingTimer(io, game);
    }
}
