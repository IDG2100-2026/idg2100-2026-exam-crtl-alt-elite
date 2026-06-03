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

    // Calculate the current highest bet across all players
    const highestBet = Math.max(0, ...game.players.map(p => p.currentBet));

    switch (action) {
        case "bet":
            // Opening bet, must be more than 0
            // Only valid when no one has bet yet
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

        case "raise":
            // Must bet strictly more than the current highest bet
            if (amount <= highestBet) {
                return socket.emit("error", {
                    msg: `You must raise above the current highest bet of ${highestBet}`
                });
            }
            if (amount > player.points) {
                return socket.emit("error", { msg: "You don't have enough points" });
            }
            player.points -= amount;
            player.currentBet = amount;
            game.pot += amount;
            break;
        
        case "match": {
            // Curly braces added to allow const declarations in case block
            // Match the current highest bet exactly
            // Handles partial bets - players only pay the difference
            const matchAmount = highestBet - player.currentBet;

            // If player can't afford to match, force fold
            // Their already-bet points stay in the pot
            if (matchAmount > player.points) {
                currentRound.folded = true;
                currentRound.bets.push({
                    userId: socket.user.userId,
                    amount: 0,
                    action: "fold"
                });
                await game.save();

                // Include player points so frontend stays in sync
                io.to(`game:${gameId}`).emit("bet_update", {
                    userId: socket.user.userId,
                    action: "fold",
                    amount: 0,
                    pot: game.pot,
                    roundNumber: game.currentRound,
                    forcedFold: true,
                    players: game.players.map(p => ({ userId: p.userId, points: p.points }))
                });

                // Check if betting is complete after forced fold
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
            // Already bet points stay in the pot
            currentRound.folded = true;
            break;
        
        default:
            return socket.emit("error", { msg: "Invalid bet action" });
    }

    // Record the bet action
    currentRound.bets.push({
        userId: socket.user.userId,
        amount: action === "fold" ? 0 : amount,
        action
    });

    await game.save();

    // Broadcast the bet to all players
    // Include updated player points so frontend stays in sync and avoids drift
    io.to(`game:${gameId}`).emit("bet_update", {
        userId: socket.user.userId,
        action,
        amount: action === "fold" ? 0 : amount,
        pot: game.pot,
        roundNumber: game.currentRound,
        players: game.players.map(p => ({ userId: p.userId, points: p.points }))
    });

    // Recalculate highest bet after the action since a raise may have changed it
    const currentHighestBet = Math.max(0, ...game.players.map(p => p.currentBet));

    // Check if betting is complete
    // Betting ends when all active players have matched or folded
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