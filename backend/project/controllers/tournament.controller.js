import { Tournament } from "../models/tournament.js";
import { Game } from "../models/game.js";
import { User } from "../models/user.js";
import tournamentServices from "../services/tournament.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

export async function getAllTournaments(req, res, next) {
    try {
        const {
            page = PAGE,
            limit = LIMIT,
            status,
            sort = "scheduledAt",
            order = "asc",
            search
        } = req.query;

        const filter = {};
        if (status) filter.status = status;

        if (search && search.length >= 3) {
            filter.title = { $regex: search, $options: "i" };
        }

        const sortOrder = order === "asc" ? 1 : -1;

        const sortField = sort === "players"
            ? null
            : sort === "title"
                ? "title"
                : "scheduledAt";

        let tournaments;
        let total;

        if (sort === "players") {
            const pipeline = [
                { $match: filter },
                { $addFields: { playerCount: { $size: "$players" } } },
                { $sort: { playerCount: sortOrder } },
                { $skip: (page - 1) * limit },
                { $limit: Number(limit) }
            ];

            tournaments = await Tournament.aggregate(pipeline);
            total = await Tournament.countDocuments(filter);
        } else {
            tournaments = await Tournament.find(filter)
                .populate("variantId")
                .populate("trophyId")
                .sort({ [sortField]: sortOrder })
                .skip((page - 1) * limit)
                .limit(Number(limit));

            total = await Tournament.countDocuments(filter);
        }

        res.json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            tournaments
        });
    } catch (err) {
        next(err);
    }
}

export async function getTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        await tournament.populate("variantId");
        await tournament.populate("trophyId");
        await tournament.populate("matches.gameId");

        const playerUsers = await User.find(
            { userId: { $in: tournament.players } },
            { userId: 1, username: 1, eloRating: 1 }
        );
        const userMap = new Map(playerUsers.map(u => [u.userId, u]));

        const tournamentObj = tournament.toObject();
        tournamentObj.playerDetails = tournament.players.map(userId => ({
            userId,
            username: userMap.get(userId)?.username ?? String(userId),
            eloRating: userMap.get(userId)?.eloRating ?? 1000
        }));

        res.json(tournamentObj);
    } catch (err) {
        next(err);
    }
}

export async function getTournamentStandings(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        const sortedStandings = [...tournament.standings]
            .sort((a, b) => b.points - a.points);

        res.json({
            tournamentId: tournament.tournamentId,
            title: tournament.title,
            status: tournament.status,
            currentRound: tournament.currentRound,
            numRounds: tournament.numRounds,
            standings: sortedStandings,
            winnerId: tournament.winnerId
        });
    } catch (err) {
        next(err);
    }
}

export async function joinTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        if (tournament.status !== "upcoming") {
            return res.status(400).json({ msg: "You can only join upcoming tournaments" });
        }

        if (tournament.players.length >= tournament.maxPlayers) {
            return res.status(400).json({ msg: "Tournament is full" });
        }

        if (tournament.players.includes(req.user.userId)) {
            return res.status(409).json({ msg: "You have already joined this tournament" });
        }

        if (tournament.eloMin !== null && tournament.eloMax !== null) {
            if (req.user.eloRating < tournament.eloMin || req.user.eloRating > tournament.eloMax) {
                return res.status(400).json({
                    msg: `Your ELO rating must be between ${tournament.eloMin} and ${tournament.eloMax} to join this tournament`
                });
            }
        }

        tournament.players.push(req.user.userId);

        tournament.standings.push({ userId: req.user.userId, points: 0 });

        await tournament.save();

        res.json({ msg: "Successfully joined the tournament", tournament });
    } catch (err) {
        next(err);
    }
}

export async function leaveTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        const playerIndex = tournament.players.indexOf(req.user.userId);
        if (playerIndex === -1) {
            return res.status(400).json({ msg: "You are not in this tournament" });
        }

        tournament.players.splice(playerIndex, 1);

        tournament.standings = tournament.standings.filter(
            s => s.userId !== req.user.userId
        );

        await tournament.save();

        res.json({ msg: "Successfully left the tournament" });
    } catch (err) {
        next(err);
    }
}

export async function createTournament(req, res, next) {
    try {
        const {
            title,
            description,
            variantId,
            maxPlayers,
            breakDuration,
            scheduledAt,
            numRounds,
            trophyTitle,
            eloMin,
            eloMax
        } = req.validData;

        if (!tournamentServices.isDateInFuture(scheduledAt)) {
            return res.status(400).json({ msg: "Tournament must be scheduled in the future" });
        }

        if ((eloMin === undefined) !== (eloMax === undefined)) {
            return res.status(400).json({ msg: "eloMin and eloMax must both be provided or both omitted" });
        }

        if (eloMin !== undefined && eloMax !== undefined && eloMin >= eloMax) {
            return res.status(400).json({ msg: "eloMin must be less than eloMax" });
        }

        const trophy = await tournamentServices.createTrophy(
            trophyTitle,
            req.file ? req.file.path : null
        );

        const tournament = new Tournament({
            title,
            description,
            variantId,
            maxPlayers,
            breakDuration,
            scheduledAt,
            numRounds,
            eloMin: eloMin ?? null,
            eloMax: eloMax ?? null,
            trophyId: trophy._id,
            createdBy: req.user.userId
        });

        await tournament.save();

        res.status(201).json(tournament);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

export async function updateTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        if (tournament.status !== "upcoming") {
            return res.status(400).json({ msg: "Only upcoming tournaments can be updated" });
        }

        const error = tournamentServices.applyTournamentUpdates(tournament, req.validData);
        if (error) {
            return res.status(400).json({ msg: error });
        }

        await tournament.save();
        res.json(tournament);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

export async function cancelTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        if (tournament.status === "finished" || tournament.status === "cancelled") {
            return res.status(400).json({ msg: "Tournament is already finished or cancelled" });
        }

        tournament.status = "cancelled";
        await tournament.save();

        res.json({ msg: "Tournament cancelled successfully", tournament });
    } catch (err) {
        next(err);
    }
}

export async function deleteTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        if (tournament.trophyId) {
            await tournamentServices.deleteTrophy(tournament.trophyId);
        }

        await Tournament.deleteOne({ tournamentId: tournament.tournamentId });

        res.json({ msg: "Tournament deleted successfully" });
    } catch (err) {
        next(err);
    }
}

export async function getTournamentGames(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        const games = await Game.find({
            tournamentId: tournament.tournamentId,
            status: { $in: ["room", "ongoing"] }
        }).populate("variantId");

        res.json({ games });
    } catch (err) {
        next(err);
    }
}

export default {
    getAllTournaments,
    getTournament,
    getTournamentStandings,
    joinTournament,
    leaveTournament,
    createTournament,
    updateTournament,
    cancelTournament,
    deleteTournament,
    getTournamentGames
};
