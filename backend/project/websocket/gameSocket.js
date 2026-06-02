import { Game } from "../models/game.js";
import { filterRollsForUser } from "../services/game.services.js";
import { handleReRoll, endTurn, ROLLS_PER_TURN } from "./handlers/rollHandler.js";
import { handleBet } from "./handlers/betHandler.js";
import { handleRoundEnd } from "./handlers/roundHandler.js";
import { clearTurnTimer, clearBettingTimer } from "../utils/gameTimer.js";

export function registerGameHandlers(io, socket) {

    // Player joins a game's Socket.io room
    socket.on("join_game", async (gameId) => {
        try {
            const game = await Game.findOne({ gameId: Number(gameId) })
                .populate("variantId");

            if (!game) {
                return socket.emit("error", { msg: "Game not found" });
            }

            const isPlayer = game.players.some(p => p.userId === socket.user?.userId);

            if (!isPlayer && socket.user?.role !== "anonymous") {
                socket.isSpectator = true;
            }

            socket.gameId = gameId;
            socket.join(`game:${gameId}`);

            // Send filtered game state to the joining user
            const gameObj = game.toObject();
            gameObj.players = filterRollsForUser(gameObj.players, socket.user?.userId || null);
            socket.emit("game_state", gameObj);

            // Restore game state for reconnecting players
            if (game.status === "ongoing" && isPlayer) {
                sendCurrentRollToReconnectingPlayer(socket, game);
            }

        } catch (err) {
            console.error("join_game error:", err.message);
            socket.emit("error", { msg: "Failed to join game" });
        }
    });

    // Player requests a re-roll, sending which dice they want to keep
    // holds: array of die indices (0-4) to keep
    socket.on("roll_dice", async ({ gameId, holds }) => {
        try {
            if (socket.isSpectator || socket.user?.role === "anonymous") {
                return socket.emit("error", { msg: "You are not a player in this game" });
            }
            await handleReRoll(io, socket, gameId, holds);
        } catch (err) {
            console.error("roll_dice error:", err.message);
            socket.emit("error", { msg: "Failed to roll dice" });
        }
    });

    // Player explicitly ends their turn before using all 3 rolls
    socket.on("end_turn", async ({ gameId }) => {
        try {
            if (socket.isSpectator || socket.user?.role === "anonymous") return;

            const game = await Game.findOne({ gameId: Number(gameId) });
            if (!game || game.status !== "ongoing" || game.currentPhase !== "rolling") return;
            if (game.currentTurnUserId !== socket.user.userId) return;
            if (game.rollsUsed < 1) return; // must have rolled at least once

            await endTurn(io, gameId);
        } catch (err) {
            console.error("end_turn error:", err.message);
        }
    });

    // Player sends a bet action during the betting phase
    socket.on("place_bet", async ({ gameId, action, amount }) => {
        try {
            if (socket.isSpectator || socket.user?.role === "anonymous") {
                return socket.emit("error", { msg: "You are not a player in this game" });
            }
            await handleBet(io, socket, gameId, action, amount);
        } catch (err) {
            console.error("place_bet error:", err.message);
            socket.emit("error", { msg: "Failed to place bet" });
        }
    });

    // Player disconnects — grace period before marking as abandoned
    socket.on("disconnect", async () => {
        try {
            if (!socket.gameId || !socket.user?.userId) return;

            const gameId = socket.gameId;
            const userId = socket.user.userId;

            setTimeout(async () => {
                try {
                    // Check if the player reconnected during the grace period
                    const room = await io.in(`game:${gameId}`).fetchSockets();
                    const reconnected = room.some(s => s.user?.userId === userId);
                    if (reconnected) return;

                    const game = await Game.findOne({ gameId: Number(gameId) }).populate("variantId");
                    if (!game || game.status !== "ongoing") return;

                    const player = game.players.find(p => p.userId === userId);
                    if (!player || player.abandoned) return;

                    player.abandoned = true;
                    await game.save();

                    io.to(`game:${gameId}`).emit("player_abandoned", {
                        userId,
                        username: socket.user.username
                    });

                    // If it was this player's rolling turn, skip to next
                    if (game.currentPhase === "rolling" && game.currentTurnUserId === userId) {
                        await endTurn(io, Number(gameId));
                    }

                    // Only force-end the round if no active players remain
                    const stillActive = game.players.filter(p => !p.abandoned);
                    if (stillActive.length === 0) {
                        clearTurnTimer(Number(gameId));
                        clearBettingTimer(Number(gameId));
                        const fresh = await Game.findOne({ gameId: Number(gameId) }).populate("variantId");
                        if (fresh) await handleRoundEnd(io, fresh);
                    }
                } catch (err) {
                    console.error("disconnect grace period error:", err.message);
                }
            }, 10000);

        } catch (err) {
            console.error("disconnect error:", err.message);
        }
    });
}

// Restores a reconnecting player's current roll state
function sendCurrentRollToReconnectingPlayer(socket, game) {
    const player = game.players.find(p => p.userId === socket.user.userId);
    const currentRound = player?.rounds?.find(r => r.roundNumber === game.currentRound);

    if (game.currentPhase === "rolling") {
        // Send whose turn it is and how many rolls they've used
        socket.emit("turn_update", {
            currentTurnUserId: game.currentTurnUserId,
            rollsUsed: game.rollsUsed,
            rollsTotal: ROLLS_PER_TURN,
            roundNumber: game.currentRound,
            expiresAt: null // timer already running, don't restart countdown
        });

        // If it's this player's turn and they have existing dice, restore them
        if (game.currentTurnUserId === socket.user.userId && currentRound?.rolls?.length > 0) {
            socket.emit("roll_result", {
                roundNumber: game.currentRound,
                rolls: currentRound.rolls,
                holds: currentRound.holds || [],
                rollsUsed: game.rollsUsed,
                rollsTotal: ROLLS_PER_TURN
            });
        }

        // If they already finished their turn, send their locked dice
        if (game.currentTurnUserId !== socket.user.userId && currentRound?.rolls?.length > 0) {
            socket.emit("my_rolls_locked", {
                roundNumber: game.currentRound,
                rolls: currentRound.rolls,
                holds: currentRound.holds || []
            });
        }
    }
}
