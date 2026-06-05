import { User } from "../models/user.js";
import { Game } from "../models/game.js";

import {
    ELO_K_FACTOR,
    RECENT_GAMES
} from "../config/constants.js";

export function calculateNewELO(playerElo, opponentElo, actualScore) {
    const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

    return Math.round(playerElo + ELO_K_FACTOR * (actualScore - expected));
}

export async function updateELORatings(players, gameMongoId) {
    const userDocs = await Promise.all(
        players.map(p => User.findOne({ userId: p.userId }))
    );

    const validUsers = userDocs.filter(Boolean);

    const eloDeltas = new Map(validUsers.map(u => [u.userId, 0]));

    for (let i = 0; i < validUsers.length; i++) {
        for (let j = i + 1; j < validUsers.length; j++) {
            const userA = validUsers[i];
            const userB = validUsers[j];

            const playerA = players.find(p => p.userId === userA.userId);
            const playerB = players.find(p => p.userId === userB.userId);

            let scoreA, scoreB;
            if (playerA.finalPoints > playerB.finalPoints) {
                scoreA = 1;
                scoreB = 0;
            } else if (playerA.finalPoints < playerB.finalPoints) {
                scoreA = 0;
                scoreB = 1;
            } else {
                scoreA = 0.5;
                scoreB = 0.5;
            }

            const newEloA = calculateNewELO(userA.eloRating, userB.eloRating, scoreA);
            const newEloB = calculateNewELO(userB.eloRating, userA.eloRating, scoreB);

            eloDeltas.set(userA.userId, eloDeltas.get(userA.userId) + (newEloA - userA.eloRating));
            eloDeltas.set(userB.userId, eloDeltas.get(userB.userId) + (newEloB - userB.eloRating));
        }
    }

    await Promise.all(
        validUsers.map(async user => {
            const delta = eloDeltas.get(user.userId);
            const newElo = Math.max(0, user.eloRating + delta);

            const recentGames = [gameMongoId, ...user.recentGames].slice(0, RECENT_GAMES);

            await User.updateOne(
                {
                    userId: user.userId
                },
                {
                    eloRating: newElo,
                    recentGames
                }
            );
        })
    );
}

export async function returnPointsToProfiles(players) {
    await Promise.all(
        players.map(player =>
            User.updateOne(
                { userId: player.userId },
                { $inc: { points: player.finalPoints ?? player.points } }
            )
        )
    );
}

export function determineWinners(players) {
    const maxPoints = Math.max(...players.map(p => p.finalPoints ?? p.points));
    return players
        .filter(p => (p.finalPoints ?? p.points) === maxPoints)
        .map(p => p.userId);
}

export async function createRoom({ variantId, userId, buyIn }) {
    const game = new Game({
        variantId,
        players: [{
            userId,
            points: buyIn * 10,
            currentBet: 0,
            abandoned: false,
            rounds: []
        }],
        pot: 0,
        status: "room"
    });

    await game.save();
    return game;
}

const POKER_FACES = ["7", "8", "J", "Q", "K", "A"];

export function rollDice() {
    return Array.from(
        { length: 5 },
        () => POKER_FACES[Math.floor(Math.random() * POKER_FACES.length)]
    );
}

export function filterRollsForUser(players, requestingUserId) {
    return players.map(player => {
        if (player.userId === requestingUserId) return player;

        return {
            ...player,
            rounds: player.rounds.map(round => ({
                ...round,
                rolls: round.revealed ? round.rolls : [],
                holds: round.revealed ? round.holds : []
            }))
        };
    });
}

export async function enrichGameWithUserInfo(game) {
    if (!game.players || game.players.length === 0) return game;

    const userIds = game.players.map(p => p.userId).filter(Boolean);
    const users = await User.find(
        { userId: { $in: userIds } },
        { userId: 1, username: 1, eloRating: 1 }
    );

    const userMap = new Map(users.map(u => [u.userId, u]));

    game.players = game.players.map(player => {
        const user = userMap.get(player.userId);
        if (!user) return player;
        return {
            ...player,
            username: user.username,
            eloRating: user.eloRating
        };
    });

    return game;
}

export default {
    calculateNewELO,
    updateELORatings,
    returnPointsToProfiles,
    determineWinners,
    createRoom,
    rollDice,
    filterRollsForUser,
    enrichGameWithUserInfo
};
