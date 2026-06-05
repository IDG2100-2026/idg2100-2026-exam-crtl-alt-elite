import { Tournament } from "../models/tournament.js";
import { Trophy } from "../models/trophy.js";
import { Game } from "../models/game.js";
import { User } from "../models/user.js";

export async function findTournamentById(id) {
    return await Tournament.findOne({ tournamentId: Number(id) });
}

export function isDateInFuture(date) {
    return new Date(date) > new Date();
}

export async function createTrophy(trophyTitle, imagePath = null) {
    const trophy = new Trophy({
        title: trophyTitle,
        image: imagePath
    });
    await trophy.save();
    return trophy;
}

export async function deleteTrophy(trophyId) {
    await Trophy.deleteOne({ _id: trophyId });
}

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

    return null;
}

export async function pairPlayersForRound(tournament, roundNumber) {
    const players = [...tournament.players];

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

export async function startTournamentRound(io, tournament) {
    if (tournament.players.length < tournament.maxPlayers) {
        throw new Error("Tournament cannot start until all player spots are filled");
    }

    const roundNumber = tournament.currentRound;
    const pairs = await pairPlayersForRound(tournament, roundNumber);

    const createdGames = [];

    for (const pair of pairs) {
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

export async function updateStandings(tournament, userId, pointsEarned) {
    const standing = tournament.standings.find(s => s.userId === userId);

    if (standing) {
        standing.points += pointsEarned;
    } else {
        tournament.standings.push({ userId, points: pointsEarned });
    }
}

export async function isRoundComplete(tournament) {
    const currentRoundMatches = tournament.matches.filter(
        m => m.round === tournament.currentRound
    );

    return currentRoundMatches.every(m => m.winnerId !== null);
}

export async function advanceTournament(io, tournament) {
    if (tournament.currentRound >= tournament.numRounds) {
        await finishTournament(io, tournament);
    } else {
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

export async function finishTournament(io, tournament) {
    const maxPoints = Math.max(...tournament.standings.map(s => s.points));
    const winners = tournament.standings
        .filter(s => s.points === maxPoints)
        .map(s => s.userId);

    tournament.winnerId = winners;
    tournament.status = "finished";
    tournament.finishedAt = new Date();
    await tournament.save();

    const bonusPoints = calculateTournamentReward(tournament);

    await Promise.all(
        winners.map(async winnerId => {
            await User.updateOne(
                { userId: winnerId },
                { $inc: { points: bonusPoints } }
            );

            await User.updateOne(
                { userId: winnerId },
                { $push: { trophies: { trophyId: tournament.trophyId, awardedAt: new Date() } } }
            );
        })
    );

    if (io) {
        io.to(`tournament:${tournament.tournamentId}`).emit("tournament_end", {
            tournamentId: tournament.tournamentId,
            winners,
            bonusPoints
        });
    }
}

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
