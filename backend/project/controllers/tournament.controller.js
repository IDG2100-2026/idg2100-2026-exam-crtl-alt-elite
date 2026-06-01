import { Tournament } from "../models/tournament.js";
import { Game } from "../models/game.js";
import tournamentServices from "../services/tournament.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

// GET /api/tournaments
// Public, returns a paginated list of tournaments
// Supports filtering by status, sorting by date/title/players
// Supports searching by title (partial match, min 3 characters)
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

        // Search by title, partial match
        // Only applied if search term is at least 3 characters
        if (search && search.length >= 3) {
            filter.title = { $regex: search, $options: "i" };
        }

        const sortOrder = order === "asc" ? 1 : -1;

        // Allow sorting by date, title or number of players
        const sortField = sort === "players"
            ? null // handled separately below
            : sort === "title"
                ? "title"
                : "scheduledAt";

        let tournaments;
        let total;

        if (sort === "players") {
            // Sorting by number of players requires aggregation
            // since players is an array and we need its length
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

// GET /api/tournaments/:id
// Public, returns a single tournament by tournamentId
export async function getTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        await tournament.populate("variantId");
        await tournament.populate("trophyId");
        await tournament.populate("matches.gameId");

        res.json(tournament);
    } catch (err) {
        next(err);
    }
}

// GET /api/tournaments/:id/standings
// Public, returns the current standings for a tournament
export async function getTournamentStandings(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        // Sort standings by points descending
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

// POST /api/tournaments/:id/players
// Registered users only, joins a tournament
export async function joinTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        // Can only join upcoming tournaments
        if (tournament.status !== "upcoming") {
            return res.status(400).json({ msg: "You can only join upcoming tournaments" });
        }

        // Check if tournament is full
        if (tournament.players.length >= tournament.maxPlayers) {
            return res.status(400).json({ msg: "Tournament is full" });
        }

        // Check if user has already joined
        if (tournament.players.includes(req.user.userId)) {
            return res.status(409).json({ msg: "You have already joined this tournament" });
        }

        // Check ELO range restriction if set
        if (tournament.eloMin !== null && tournament.eloMax !== null) {
            if (req.user.eloRating < tournament.eloMin || req.user.eloRating > tournament.eloMax) {
                return res.status(400).json({
                    msg: `Your ELO rating must be between ${tournament.eloMin} and ${tournament.eloMax} to join this tournament`
                });
            }
        }

        tournament.players.push(req.user.userId);

        // Add player to standings with 0 points
        tournament.standings.push({ userId: req.user.userId, points: 0 });

        await tournament.save();

        res.json({ msg: "Successfully joined the tournament", tournament });
    } catch (err) {
        next(err);
    }
}

// DELETE /api/tournaments/:id/players/:userId
// Registered users only, leaves a tournament
// Users can leave at any point
export async function leaveTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        // Check if user is in the tournament
        const playerIndex = tournament.players.indexOf(req.user.userId);
        if (playerIndex === -1) {
            return res.status(400).json({ msg: "You are not in this tournament" });
        }

        // Remove player from players array
        tournament.players.splice(playerIndex, 1);

        // Remove player from standings
        tournament.standings = tournament.standings.filter(
            s => s.userId !== req.user.userId
        );

        await tournament.save();

        res.json({ msg: "Successfully left the tournament" });
    } catch (err) {
        next(err);
    }
}

// POST /api/tournaments
// Admins only, creates a new tournament
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

        // Tournament must be scheduled in the future
        if (!tournamentServices.isDateInFuture(scheduledAt)) {
            return res.status(400).json({ msg: "Tournament must be scheduled in the future" });
        }

        // Validate ELO range if provided
        if ((eloMin === undefined) !== (eloMax === undefined)) {
            return res.status(400).json({ msg: "eloMin and eloMax must both be provided or both omitted" });
        }

        if (eloMin !== undefined && eloMax !== undefined && eloMin >= eloMax) {
            return res.status(400).json({ msg: "eloMin must be less than eloMax" });
        }

        // Create trophy first so it can be referenced
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

// PUT /api/tournaments/:id
// Admins only, updates a tournament
// Only allowed if tournament is still upcoming
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

// PUT /api/tournaments/:id/cancellation
// Admins only, cancels a tournament
// Tournament remains visible but can no longer be joined
export async function cancelTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        // Can only cancel upcoming or ongoing tournaments
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

// DELETE /api/tournaments/:id
// Admins only, permanently deletes a tournament and its trophy
export async function deleteTournament(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        // Delete the associated trophy
        if (tournament.trophyId) {
            await tournamentServices.deleteTrophy(tournament.trophyId);
        }

        await Tournament.deleteOne({ tournamentId: tournament.tournamentId });

        res.json({ msg: "Tournament deleted successfully" });
    } catch (err) {
        next(err);
    }
}

// GET /api/tournaments/:id/games
// Public, returns all ongoing games in a tournament
// Used to show spectators the list of ongoing games
export async function getTournamentGames(req, res, next) {
    try {
        const tournament = await tournamentServices.findTournamentById(req.validData.id);

        if (!tournament) {
            return res.status(404).json({ msg: "Tournament not found" });
        }

        // Get all ongoing games for this tournament
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