import { Game } from "../models/game.js";
import { GameVariant } from "../models/gameVariant.js";
import { User } from "../models/user.js";
import gameServices from "../services/game.services.js";
import { getIO } from "../websocket/socket.js";
import { handleRoll } from "../websocket/handlers/rollHandler.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

// GET /api/games
// Public, returns a paginated, filterable list of games
// Supports filtering by status, variantId, and userId
export async function getAllGames(req, res, next) {
    try {
        const {
            page = PAGE,
            limit = LIMIT,
            status,
            variantId,
            sort = "createdAt",
            order = "desc",
            userId
        } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (variantId) filter.variantId = variantId;

        // Filter games where a specific user is a player
        // Uses the players array instead of playerOne/playerTwo
        if (userId) filter["players.userId"] = Number(userId);

        const sortOrder = order === "asc" ? 1 : -1;

        const games = await Game.find(filter)
            .populate("variantId")
            .sort({ [sort]: sortOrder })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Game.countDocuments(filter);

        // Enrich each game with player usernames and ELO ratings
        const enrichedGames = await Promise.all(
            games.map(game => gameServices.enrichGameWithUserInfo(game.toObject()))
        );

        res.json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            games: enrichedGames
        });
    } catch (err) {
        next(err);
    }
}

// GET /api/games/:id
// Public, returns a single game by gameId
// Filters out other players' rolls if the game is ongoing
export async function getGame(req, res, next) {
    try {
        const game = await Game.findOne({ gameId: Number(req.validData.id) })
            .populate("variantId");

        if (!game) {
            return res.status(404).json({ msg: "Game was not found" });
        }

        const g = game.toObject();

        // Enrich with player usernames and ELO ratings
        await gameServices.enrichGameWithUserInfo(g);

        // Filter out other players' unrevealed rolls
        // Each player can only see their own rolls until reveal phase
        const requestingUserId = req.user?.userId || null;
        g.players = gameServices.filterRollsForUser(g.players, requestingUserId);

        res.json(g);
    } catch (err) {
        next(err);
    }
}

// POST /api/games
// Registered users only, creates a new game room
// Game starts automatically when the required number of players have joined
export async function createRoom(req, res, next) {
    try {
        const { variantId } = req.validData;

        // Check the variant exists
        const variant = await GameVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({ msg: "Game variant not found" });
        }

        // Check the user has enough points for the buy-in
        const user = await User.findOne({ userId: req.user.userId });
        if (user.points < variant.buyIn) {
            return res.status(400).json({
                msg: `You need at least ${variant.buyIn} points to join this game`
            });
        }

        // Reserve the buy-in points from the user's profile
        await User.updateOne(
            { userId: req.user.userId },
            { $inc: { points: -variant.buyIn } }
        );

        // Create the game room with the creator as the first player
        const game = await gameServices.createRoom({
            variantId,
            userId: req.user.userId,
            buyIn: variant.buyIn
        });

        res.status(201).json({ msg: "Game room created", game });
    } catch (err) {
        next(err);
    }
}

// POST /api/games/:id/players
// Registered users only, joins an existing game room
// Game starts automatically when the required number of players have joined
export async function joinRoom(req, res, next) {
    try {
        const game = await Game.findOne({ gameId: Number(req.validData.id) })
            .populate("variantId");

        if (!game) {
            return res.status(404).json({ msg: "Game was not found" });
        }

        // Can only join a room that hasn't started yet
        if (game.status !== "room") {
            return res.status(400).json({ msg: "This game is no longer accepting players" });
        }

        // Check the user isn't already in the game
        const alreadyJoined = game.players.some(p => p.userId === req.user.userId);
        if (alreadyJoined) {
            return res.status(409).json({ msg: "You are already in this game" });
        }

        // Check the room isn't already full
        if (game.players.length >= game.variantId.numPlayers) {
            return res.status(400).json({ msg: "This game room is full" });
        }

        // Check the user has enough points for the buy-in
        const user = await User.findOne({ userId: req.user.userId });
        if (user.points < game.variantId.buyIn) {
            return res.status(400).json({
                msg: `You need at least ${game.variantId.buyIn} points to join this game`
            });
        }

        // Reserve the buy-in points from the user's profile
        await User.updateOne(
            { userId: req.user.userId },
            { $inc: { points: -game.variantId.buyIn } }
        );

        // Add the player to the game
        game.players.push({
            userId: req.user.userId,
            points: game.variantId.buyIn * 10,
            currentBet: 0,
            abandoned: false,
            rounds: []
        });

        // Start the game automatically if the room is now full
        const gameStarting = game.players.length === game.variantId.numPlayers;
        if (gameStarting) {
            game.status = "ongoing";
            game.startedAt = new Date();
        }

        await game.save();

        res.json({
            msg: gameStarting ? "Game is starting!" : "Joined game room",
            game
        });

        // Trigger first round after response is sent
        if (gameStarting) {
            const io = getIO();
            const freshGame = await Game.findOne({ gameId: game.gameId }).populate("variantId");
            await handleRoll(io, freshGame);
        }
    } catch (err) {
        next(err);
    }
}

// DELETE /api/games/:id/players/:userId
// Registered users only, leaves a game room before it starts
// Can only leave a room, not an ongoing game
export async function leaveRoom(req, res, next) {
    try {
        const game = await Game.findOne({ gameId: Number(req.validData.id) })
            .populate("variantId");

        if (!game) {
            return res.status(404).json({ msg: "Game was not found" });
        }

        // Can only leave a room that hasn't started yet
        if (game.status !== "room") {
            return res.status(400).json({ msg: "You can't leave a game that has already started" });
        }

        // Check the user is actually in the game
        const playerIndex = game.players.findIndex(p => p.userId === req.user.userId);
        if (playerIndex === -1) {
            return res.status(403).json({ msg: "You are not in this game" });
        }

        // Remove the player from the game
        game.players.splice(playerIndex, 1);

        // If no players left, cancel the game
        if (game.players.length === 0) {
            game.status = "cancelled";
        }

        await game.save();

        // Return the buy-in points to the user's profile
        await User.updateOne(
            { userId: req.user.userId },
            { $inc: { points: game.variantId.buyIn } }
        );

        res.json({ msg: "Left game room successfully" });
    } catch (err) {
        next(err);
    }
}

export default {
    getAllGames,
    getGame,
    createRoom,
    joinRoom,
    leaveRoom
};