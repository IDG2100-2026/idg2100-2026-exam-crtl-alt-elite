import { Tournament } from "../models/tournament.js";
import { Trophy } from "../models/trophy.js";
import { Game } from "../models/game.js";
import { User } from "../models/user.js";

// Finds a tournament by its custom tournamentId field
// Used in getTournament, joinTournament and updateTournament controllers
export async function findTournamentById(id) {
    return await Tournament.findOne({ tournamentId: Number(id) });
}

// Checks if a date is in the future
// Used in createTournament and updateTournament to validate scheduledAt
export function isDateInFuture(date) {
    return new Date(date) > new Date();
}

// Creates a trophy document for a tournament
// Trophy is created before the tournament so it can be referenced by trophyId
export async function createTrophy(trophyTitle, imagePath = null) {
    const trophy = new Trophy({
        title: trophyTitle,
        image: imagePath
    });
    await trophy.save();
    return trophy;
}

// Deletes a trophy document
// Called when a tournament is deleted
export async function deleteTrophy(trophyId) {
    await Trophy.deleteOne({ _id: trophyId });
}

// Applies only the fields that were actually sent in the request body
// Validates scheduledAt and maxPlayers before applying
// Returns an error message string if validation fails, null if all is fine
export function applyTournamentUpdates(tournament, {
    title,
    description,
    scheduledAt,
    breakDuration,
    maxPlayers,
    numRounds,
    eloMin,
    eloMax
}) {
    if (title) tournament.title = title;
    if (description) tournament.description = description;
    if (breakDuration !== undefined) tournament.breakDuration = breakDuration;
    if (numRounds) tournament.numRounds = numRounds;

    // Handle ELO range updates
    // Both must be provided together or both omitted
    const updatingMin = eloMin !== undefined;
    const updatingMax = eloMax !== undefined;

    if (updatingMin !== updatingMax) {
        return "eloMin and eloMax must both be updated together";
    }

    if (updatingMin && updatingMax) {
        if (eloMin >= eloMax) {
            return "eloMin must be less than eloMax";
        }
        tournament.eloMin = eloMin;
        tournament.eloMax = eloMax;
    }

    if (scheduledAt) {
        if (!isDateInFuture(scheduledAt)) {
            return "Tournament must be scheduled in the future";
        }
        tournament.scheduledAt = scheduledAt;
    }

    if (maxPlayers) {
        if (maxPlayers < tournament.players.length) {
            return "Cannot reduce maxPlayers below current number of registered players";
        }
        tournament.maxPlayers = maxPlayers;
    }

    // null means no validation errors
    return null;
}

// Randomly pairs players into games for a tournament round
// Players are shuffled and paired sequentially
// Tournament can only start when maxPlayers is reached, ensuring even number of players
export async function pairPlayersForRound(tournament, roundNumber) {
    const players = [...tournament.players];

    // Fisher-Yates shuffle for random pairing
    // Reference: https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }

    const pairs = [];
    for (let i = 0; i < players.length - 1; i += 2) {
        pairs.push({
            playerOne: players[i],
            playerTwo: players[i + 1],
            round: roundNumber
        });
    }

    return pairs;
}

// Creates games for a tournament round based on pairings
// Returns the created games
export async function startTournamentRound(io, tournament) {
    // Ensure tournament is full before starting
    if (tournament.players.length < tournament.maxPlayers) {
        throw new Error("Tournament cannot start until all player spots are filled");
    }

    const roundNumber = tournament.currentRound;
    const pairs = await pairPlayersForRound(tournament, roundNumber);

    const createdGames = [];

    for (const pair of pairs) {
        // Create a game room for this pairing
        const game = new Game({
            variantId: tournament.variantId,
            players: [
                {
                    userId: pair.playerOne,
                    points: tournament.variantId.buyIn,
                    currentBet: 0,
                    abandoned: false,
                    rounds: []
                },
                {
                    userId: pair.playerTwo,
                    points: tournament.variantId.buyIn,
                    currentBet: 0,
                    abandoned: false,
                    rounds: []
                }
            ],
            pot: 0,
            status: "room",
            tournamentId: tournament.tournamentId
        });

        await game.save();

        // Add match to tournament
        tournament.matches.push({
            playerOne: pair.playerOne,
            playerTwo: pair.playerTwo,
            gameId: game.gameId,
            round: roundNumber,
            winnerId: null
        });

        createdGames.push(game);
    }

    tournament.status = "ongoing";
    tournament.startedAt = tournament.startedAt || new Date();
    await tournament.save();

    // Notify all players via WebSocket that their game is ready
    if (io) {
        for (const game of createdGames) {
            const gamePlayerIds = game.players.map(p => p.userId);
            for (const userId of gamePlayerIds) {
                io.to(`user:${userId}`).emit("tournament_game_ready", {
                    tournamentId: tournament.tournamentId,
                    gameId: game.gameId
                });
            }
        }
    }

    return createdGames;
}

// Updates tournament standings when a game finishes
// Called from the game end handler when a tournament game completes
export async function updateStandings(tournament, userId, pointsEarned) {
    const standing = tournament.standings.find(s => s.userId === userId);

    if (standing) {
        standing.points += pointsEarned;
    } else {
        tournament.standings.push({ userId, points: pointsEarned });
    }
}

// Checks if all games in the current round are finished
// Returns true if the round is complete
export async function isRoundComplete(tournament) {
    const currentRoundMatches = tournament.matches.filter(
        m => m.round === tournament.currentRound
    );

    // A match is complete if it has a winnerId
    return currentRoundMatches.every(m => m.winnerId !== null);
}

// Advances the tournament to the next round or finishes it
// Called when all games in the current round are complete
export async function advanceTournament(io, tournament) {
    if (tournament.currentRound >= tournament.numRounds) {
        // All rounds complete - determine winner
        await finishTournament(io, tournament);
    } else {
        // Start the next round after the break duration
        tournament.currentRound += 1;
        await tournament.save();

        const breakMs = (tournament.breakDuration || 0) * 60 * 1000;

        setTimeout(async () => {
            const updatedTournament = await Tournament.findOne({
                tournamentId: tournament.tournamentId
            }).populate("variantId");

            if (updatedTournament && updatedTournament.status === "ongoing") {
                await startTournamentRound(io, updatedTournament);
            }
        }, breakMs);
    }
}

// Determines the tournament winner and awards trophy and bonus points
export async function finishTournament(io, tournament) {
    // Find the player(s) with the most accumulated points
    const maxPoints = Math.max(...tournament.standings.map(s => s.points));
    const winners = tournament.standings
        .filter(s => s.points === maxPoints)
        .map(s => s.userId);

    tournament.winnerId = winners;
    tournament.status = "finished";
    tournament.finishedAt = new Date();
    await tournament.save();

    // Award trophy and bonus points to winner(s)
    // Bonus points formula: buyIn * numberOfPlayers
    // More players and higher buy-in = harder tournament = more reward
    const bonusPoints = calculateTournamentReward(tournament);

    await Promise.all(
        winners.map(async winnerId => {
            // Award bonus points
            await User.updateOne(
                { userId: winnerId },
                { $inc: { points: bonusPoints } }
            );

            // Award trophy to winner's profile
            await User.updateOne(
                { userId: winnerId },
                { $push: { trophies: { trophyId: tournament.trophyId, awardedAt: new Date() } } }
            );
        })
    );

    // Notify all players the tournament is over
    if (io) {
        io.to(`tournament:${tournament.tournamentId}`).emit("tournament_end", {
            tournamentId: tournament.tournamentId,
            winners,
            bonusPoints
        });
    }
}

// Calculates the points reward for winning a tournament
// Formula: buyIn * numberOfPlayers
// More players and higher buy-in = harder tournament = more reward
export function calculateTournamentReward(tournament) {
    return tournament.variantId.buyIn * tournament.players.length;
}

export default {
    findTournamentById,
    isDateInFuture,
    createTrophy,
    deleteTrophy,
    applyTournamentUpdates,
    pairPlayersForRound,
    startTournamentRound,
    updateStandings,
    isRoundComplete,
    advanceTournament,
    finishTournament,
    calculateTournamentReward
};