import { Game } from "../models/game.js";
import { filterRollsForUser } from "../services/game.services.js";
import { handleHold } from "./handlers/rollHandler.js";
import { handleBet } from "./handlers/betHandler.js";
import { handleRoundEnd } from "./handlers/roundHandler.js";

// Registers all game-related WebSocket event handlers for a socket
export function registerGameHandlers(io, socket) {

    // Player joins a game room
    // gameId is the custom numeric gameId, not the MongoDB _id
    socket.on("join_game", async (gameId) => {
        try {
            const game = await Game.findOne({ gameId: Number(gameId) })
                .populate("variantId");

            if (!game) {
                return socket.emit("error", { msg: "Game not found" });
            }

            // Check if the user is a player or a spectator
            const isPlayer = game.players.some(p => p.userId === socket.user?.userId);

            // Anonymous users and non-players can spectate but not play
            if (!isPlayer && socket.user?.role !== "anonymous") {
                // Registered users who aren't in the game are spectators
                socket.isSpectator = true;
            }

            // Join the Socket.io room for this game
            // All players and spectators in the same room receive broadcasts
            socket.gameId = gameId;
            socket.join(`game:${gameId}`);

            // Send the current game state to the joining user
            // Filters out other players' unrevealed rolls
            const gameObj = game.toObject();
            gameObj.players = filterRollsForUser(
                gameObj.players,
                socket.user?.userId || null
            );

            socket.emit("game_state", gameObj);

            // If game is ongoing and this is a reconnecting player,
            // send them their current rolls to restore game state
            if (game.status === "ongoing" && isPlayer) {
                sendCurrentRollToReconnectingPlayer(socket, game);
            }

        } catch (err) {
            console.error("join_game error:", err.message);
            socket.emit("error", { msg: "Failed to join game" });
        }
    });

    // Player sends which dice they want to hold
    // holds is an array of indices (0-4)
    socket.on("hold_dice", async ({ gameId, holds }) => {
        try {
            // Spectators and anonymous users can't hold dice
            if (socket.isSpectator || socket.user?.role === "anonymous") {
                return socket.emit("error", { msg: "You are not a player in this game" });
            }

            await handleHold(io, socket, gameId, holds);
        } catch (err) {
            console.error("hold_dice error:", err.message);
            socket.emit("error", { msg: "Failed to hold dice" });
        }
    });

    // Player sends a bet action
    // action is one of: bet, match, raise, fold
    // amount is the number of points being bet
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

    // Player disconnects
    // If game is ongoing, mark them as abandoned
    socket.on("disconnect", async () => {
        try {
            if (!socket.gameId) return;

            const game = await Game.findOne({ gameId: Number(socket.gameId) });
            if (!game || game.status !== "ongoing") return;

            const player = game.players.find(p => p.userId === socket.user?.userId);
            if (!player) return;

            // Mark the player as abandoned
            player.abandoned = true;
            await game.save();

            // Notify all players in the room
            io.to(`game:${socket.gameId}`).emit("player_abandoned", {
                userId: socket.user.userId,
                username: socket.user.username
            });

            // Check if all remaining active players have finished
            // If so, end the round early
            await handleRoundEnd(io, game);

        } catch (err) {
            console.error("disconnect error:", err.message);
        }
    });
}

// Sends the current round's rolls to a player who has reconnected
// Ensures game state is restored on page reload as required by the exam spec
function sendCurrentRollToReconnectingPlayer(socket, game) {
    const player = game.players.find(p => p.userId === socket.user.userId);
    const currentRound = player?.rounds?.find(r => r.roundNumber === game.currentRound);

    if (currentRound?.rolls?.length > 0) {
        socket.emit("roll_result", {
            roundNumber: game.currentRound,
            rolls: currentRound.rolls,
            holds: currentRound.holds
        });
    }
}