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

export async function getAllGames(req, res, next) {
    try {
        const {
            page = PAGE,
            limit = LIMIT,
            status,
            variantId,
            sort = "createdAt",
            order = "desc",
            userId,
            rounds,
            timeControl
        } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (variantId) filter.variantId = variantId;

        if (userId) filter["players.userId"] = Number(userId);

        if (rounds || timeControl) {
            const variantFilter = {};
            if (rounds) variantFilter.rounds = Number(rounds);
            if (timeControl) variantFilter.timeControl = Number(timeControl);
            const matchingVariants = await GameVariant.find(variantFilter, { _id: 1 });
            filter.variantId = { $in: matchingVariants.map(v => v._id) };
        }

        const sortOrder = order === "asc" ? 1 : -1;

        const games = await Game.find(filter)
            .populate("variantId")
            .sort({ [sort]: sortOrder })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Game.countDocuments(filter);

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

export async function getGame(req, res, next) {
    try {
        const game = await Game.findOne({ gameId: Number(req.validData.id) })
            .populate("variantId");

        if (!game) {
            return res.status(404).json({ msg: "Game was not found" });
        }

        const g = game.toObject();

        await gameServices.enrichGameWithUserInfo(g);

        const requestingUserId = req.user?.userId || null;
        g.players = gameServices.filterRollsForUser(g.players, requestingUserId);

        res.json(g);
    } catch (err) {
        next(err);
    }
}

export async function createRoom(req, res, next) {
    try {
        const { variantId } = req.validData;

        const variant = await GameVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({ msg: "Game variant not found" });
        }

        const user = await User.findOne({ userId: req.user.userId });
        if (user.points < variant.buyIn) {
            return res.status(400).json({
                msg: `You need at least ${variant.buyIn} points to join this game`
            });
        }

        await User.updateOne(
            { userId: req.user.userId },
            { $inc: { points: -variant.buyIn } }
        );

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

export async function joinRoom(req, res, next) {
    try {
        const game = await Game.findOne({ gameId: Number(req.validData.id) })
            .populate("variantId");

        if (!game) {
            return res.status(404).json({ msg: "Game was not found" });
        }

        if (game.status !== "room") {
            return res.status(400).json({ msg: "This game is no longer accepting players" });
        }

        const alreadyJoined = game.players.some(p => p.userId === req.user.userId);
        if (alreadyJoined) {
            return res.status(409).json({ msg: "You are already in this game" });
        }

        if (game.players.length >= game.variantId.numPlayers) {
            return res.status(400).json({ msg: "This game room is full" });
        }

        const user = await User.findOne({ userId: req.user.userId });
        if (user.points < game.variantId.buyIn) {
            return res.status(400).json({
                msg: `You need at least ${game.variantId.buyIn} points to join this game`
            });
        }

        await User.updateOne(
            { userId: req.user.userId },
            { $inc: { points: -game.variantId.buyIn } }
        );

        game.players.push({
            userId: req.user.userId,
            points: game.variantId.buyIn * 10,
            currentBet: 0,
            abandoned: false,
            rounds: []
        });

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

        if (gameStarting) {
            const io = getIO();
            const freshGame = await Game.findOne({ gameId: game.gameId }).populate("variantId");
            await handleRoll(io, freshGame);
        }
    } catch (err) {
        next(err);
    }
}

export async function leaveRoom(req, res, next) {
    try {
        const game = await Game.findOne({ gameId: Number(req.validData.id) })
            .populate("variantId");

        if (!game) {
            return res.status(404).json({ msg: "Game was not found" });
        }

        if (game.status !== "room") {
            return res.status(400).json({ msg: "You can't leave a game that has already started" });
        }

        const playerIndex = game.players.findIndex(p => p.userId === req.user.userId);
        if (playerIndex === -1) {
            return res.status(403).json({ msg: "You are not in this game" });
        }

        game.players.splice(playerIndex, 1);

        if (game.players.length === 0) {
            game.status = "cancelled";
        }

        await game.save();

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
