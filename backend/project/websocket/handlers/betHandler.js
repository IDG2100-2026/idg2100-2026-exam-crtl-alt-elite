import { Game } from "../../models/game.js";
import { handleRoundEnd } from "./roundHandler.js";
import { clearRoundTimer } from "../../utils/gameTimer.js";

export async function handleBet(io, socket, gameId, action, amount) {
    const game = await Game.findOne({ gameId: Number(gameId) })
        .populate("variantId");

    if (!game || game.status !== "ongoing") {
        return socket.emit("error", { msg: "Game is not ongoing" });
    }

    if (game.currentPhase !== "betting") {
        return socket.emit("error", { msg: "It is not the betting phase" });
    }

    const player = game.players.find(p => p.userId === socket.user.userId);
    if (!player) {
        return socket.emit("error", { msg: "You are not a player in this game" });
    }

    if (player.abandoned) {
        return socket.emit("error", { msg: "Abandoned players cannot bet" });
    }

    const currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);
    if (!currentRound || currentRound.folded) {
        return socket.emit("error", { msg: "You have already folded this round" });
    }

    const highestBet = Math.max(0, ...game.players.map(p => p.currentBet));

    switch (action) {
        case "bet":
            if (highestBet !== 0) {
                return socket.emit("error", { msg: "Someone has already opened the betting, use raise or match instead" });
            }
            if (amount <= 0) {
                return socket.emit("error", { msg: "Bet amount must be more than 0" });
            }
            if (amount > player.points) {
                return socket.emit("error", { msg: "You don't have enough points" });
            }
            player.points -= amount;
            player.currentBet = amount;
            game.pot += amount;
            break;

        case "raise": {
            if (amount <= highestBet) {
                return socket.emit("error", {
                    msg: `You must raise above the current highest bet of ${highestBet}`
                });
            }
            const raiseDiff = amount - player.currentBet;
            if (raiseDiff > player.points) {
                return socket.emit("error", { msg: "You don't have enough points" });
            }
            player.points -= raiseDiff;
            player.currentBet = amount;
            game.pot += raiseDiff;
            break;
        }

        case "match": {
            const matchAmount = highestBet - player.currentBet;

            if (matchAmount > player.points) {
                currentRound.folded = true;
                currentRound.bets.push({
                    userId: socket.user.userId,
                    amount: 0,
                    action: "fold"
                });
                await game.save();

                io.to(`game:${gameId}`).emit("bet_update", {
                    userId: socket.user.userId,
                    action: "fold",
                    amount: 0,
                    pot: game.pot,
                    roundNumber: game.currentRound,
                    forcedFold: true,
                    players: game.players.map(p => ({ userId: p.userId, points: p.points }))
                });

                const forcedHighestBet = Math.max(0, ...game.players.map(p => p.currentBet));
                const forcedActivePlayers = game.players.filter(p => !p.abandoned);
                const forcedBettingComplete = forcedActivePlayers.every(p => {
                    const round = p.rounds.find(r => r.roundNumber === game.currentRound);
                    return round?.folded || p.currentBet === forcedHighestBet;
                });

                if (forcedBettingComplete) {
                    clearRoundTimer(Number(gameId));
                    await handleRoundEnd(io, game);
                }
                return;
            }

            player.points -= matchAmount;
            player.currentBet = highestBet;
            game.pot += matchAmount;
            amount = matchAmount;
            break;
        }

        case "fold":
            currentRound.folded = true;
            break;

        default:
            return socket.emit("error", { msg: "Invalid bet action" });
    }

    currentRound.bets.push({
        userId: socket.user.userId,
        amount: action === "fold" ? 0 : amount,
        action
    });

    await game.save();

    io.to(`game:${gameId}`).emit("bet_update", {
        userId: socket.user.userId,
        action,
        amount: action === "fold" ? 0 : amount,
        pot: game.pot,
        roundNumber: game.currentRound,
        players: game.players.map(p => ({ userId: p.userId, points: p.points }))
    });

    const currentHighestBet = Math.max(0, ...game.players.map(p => p.currentBet));

    const activePlayers = game.players.filter(p => !p.abandoned);
    const bettingComplete = activePlayers.every(p => {
        const round = p.rounds.find(r => r.roundNumber === game.currentRound);
        return round?.folded || p.currentBet === currentHighestBet;
    });

    if (bettingComplete) {
        clearRoundTimer(Number(gameId));
        await handleRoundEnd(io, game);
    }
}
