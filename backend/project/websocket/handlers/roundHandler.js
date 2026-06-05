import { Game } from "../../models/game.js";
import { handleRoll } from "./rollHandler.js";
import {
    determineWinners,
    returnPointsToProfiles,
    updateELORatings
} from "../../services/game.services.js";

export async function handleRoundEnd(io, game) {
    const gameId = game.gameId;

    for (const player of game.players) {
        const currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);
        if (currentRound) {
            currentRound.revealed = true;
        }
    }

    game.currentPhase = "reveal";
    await game.save();

    const revealData = game.players.map(player => {
        const currentRound = player.rounds.find(r => r.roundNumber === game.currentRound);
        return {
            userId: player.userId,
            rolls: currentRound?.rolls || [],
            holds: currentRound?.holds || [],
            folded: currentRound?.folded || false
        };
    });

    const roundWinners = determineRoundWinners(game);

    const splitAmount = Math.floor(game.pot / roundWinners.length);
    for (const winnerId of roundWinners) {
        const winner = game.players.find(p => p.userId === winnerId);
        if (winner) winner.points += splitAmount;
    }

    game.pot = 0;
    for (const player of game.players) {
        player.currentBet = 0;
    }

    game.markModified("players");
    await game.save();

    io.to(`game:${gameId}`).emit("round_end", {
        roundNumber: game.currentRound,
        reveal: revealData,
        roundWinners,
        pot: splitAmount,
        players: game.players.map(p => ({ userId: p.userId, points: p.points }))
    });

    const totalRounds = game.variantId?.rounds || 3;
    if (game.currentRound >= totalRounds) {
        await handleGameEnd(io, game);
    } else {
        game.currentRound += 1;
        game.currentPhase = "rolling";
        await game.save();

        setTimeout(async () => {
            const updatedGame = await Game.findOne({ gameId })
                .populate("variantId");
            await handleRoll(io, updatedGame);
        }, 3000);
    }
}

function determineRoundWinners(game) {
    const activePlayers = game.players.filter(player => {
        const round = player.rounds.find(r => r.roundNumber === game.currentRound);
        return !round?.folded && !player.abandoned;
    });

    if (activePlayers.length === 1) {
        return [activePlayers[0].userId];
    }

    if (activePlayers.length === 0) {
        const foldedPlayers = game.players.filter(p => {
            const round = p.rounds.find(r => r.roundNumber === game.currentRound);
            return round?.folded && !p.abandoned;
        });
        if (foldedPlayers.length === 0) return [game.players[0].userId];
        const lastFolder = foldedPlayers.reduce((best, p) =>
            p.currentBet >= best.currentBet ? p : best
        );
        return [lastFolder.userId];
    }

    const ranked = activePlayers.map(player => {
        const round = player.rounds.find(r => r.roundNumber === game.currentRound);
        return {
            userId: player.userId,
            score: evaluateHand(round?.rolls || [], game.variantId?.straightsAllowed ?? true)
        };
    });

    ranked.sort((a, b) => b.score - a.score);

    const highestScore = ranked[0].score;
    return ranked
        .filter(p => p.score === highestScore)
        .map(p => p.userId);
}

async function handleGameEnd(io, game) {
    const gameId = game.gameId;

    for (const player of game.players) {
        player.finalPoints = player.points;
    }

    game.winnerId = determineWinners(game.players);
    game.status = "finished";
    game.finishedAt = new Date();
    await game.save();

    await returnPointsToProfiles(game.players);

    await updateELORatings(game.players, game._id);

    io.to(`game:${gameId}`).emit("game_end", {
        winnerId: game.winnerId,
        players: game.players.map(p => ({
            userId: p.userId,
            finalPoints: p.finalPoints
        }))
    });
}

export function evaluateHand(dice, straightsAllowed = true) {
    if (!dice || dice.length !== 5) return 0;

    const FACE_RANK = { "7": 1, "8": 2, "J": 3, "Q": 4, "K": 5, "A": 6 };

    const counts = {};
    for (const die of dice) {
        counts[die] = (counts[die] || 0) + 1;
    }

    const values = Object.values(counts).sort((a, b) => b - a);
    const sorted = [...dice].sort((a, b) => FACE_RANK[a] - FACE_RANK[b]);

    let handScore;

    if (values[0] === 5) {
        handScore = 7;
    } else if (values[0] === 4) {
        handScore = 6;
    } else if (values[0] === 3 && values[1] === 2) {
        handScore = 5;
    } else if (straightsAllowed && sorted.every((val, i) => i === 0 || FACE_RANK[val] === FACE_RANK[sorted[i - 1]] + 1)) {
        handScore = 4;
    } else if (values[0] === 3) {
        handScore = 3;
    } else if (values[0] === 2 && values[1] === 2) {
        handScore = 2;
    } else if (values[0] === 2) {
        handScore = 1;
    } else {
        handScore = 0;
    }

    const tiebreaker = Object.entries(counts)
        .map(([face, count]) => ({ rank: FACE_RANK[face] || 0, count }))
        .sort((a, b) => b.count - a.count || b.rank - a.rank)
        .reduce((acc, { rank }, i) => acc + rank * Math.pow(10, (4 - i)), 0);

    return handScore * 1000000 + tiebreaker;
}
