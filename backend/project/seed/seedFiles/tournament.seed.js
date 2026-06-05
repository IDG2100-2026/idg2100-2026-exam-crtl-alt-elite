import { Tournament } from "../../models/tournament.js";
import { Trophy } from "../../models/trophy.js";
import { User } from "../../models/user.js";
import { GameVariant } from "../../models/gameVariant.js";
import { Game } from "../../models/game.js";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function _seedUpcomingTournament(admin, variants) {
    const trophy = new Trophy({
        title: "Summer Cup 2026"
    });
    await trophy.save();

    const variant = pick(variants);

    const tournament = new Tournament({
        title: "Summer Championship 2026",
        description: "The biggest tournament of the summer! Join now to compete for the Summer Cup.",
        variantId: variant._id,
        maxPlayers: 4,
        breakDuration: 10,
        numRounds: 3,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "upcoming",
        standings: []
    });
    await tournament.save();

    console.log("Inserted upcoming tournament 1");
}

async function _seedUpcomingEloTournament(admin, variants) {
    const trophy = new Trophy({
        title: "Elite Players Trophy"
    });
    await trophy.save();

    const variant = pick(variants);

    const tournament = new Tournament({
        title: "Elite Invitational 2026",
        description: "Only the best players qualify. ELO rating between 1000 and 1400 required.",
        variantId: variant._id,
        maxPlayers: 4,
        breakDuration: 5,
        numRounds: 2,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "upcoming",
        eloMin: 1000,
        eloMax: 1400,
        standings: []
    });
    await tournament.save();

    console.log("Inserted upcoming tournament 2");
}

async function _seedUpcomingTournament2(admin, variants) {
    const trophy = new Trophy({
        title: "Autumn Classic Trophy"
    });
    await trophy.save();

    const variant = pick(variants);

    const tournament = new Tournament({
        title: "Autumn Classic 2026",
        description: "A classic autumn tournament open to all players. Join before spots fill up!",
        variantId: variant._id,
        maxPlayers: 8,
        breakDuration: 5,
        numRounds: 2,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "upcoming",
        standings: []
    });
    await tournament.save();

    console.log("Inserted upcoming tournament 3");
}

async function _seedUpcomingTournament3(admin, variants) {
    const trophy = new Trophy({
        title: "Beginners Cup"
    });
    await trophy.save();

    const variant = pick(variants);

    const tournament = new Tournament({
        title: "Beginners Cup 2026",
        description: "Perfect for new players. Low buy-in, friendly competition.",
        variantId: variant._id,
        maxPlayers: 8,
        breakDuration: 0,
        numRounds: 2,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "upcoming",
        eloMin: 0,
        eloMax: 1100,
        standings: []
    });
    await tournament.save();

    console.log("Inserted upcoming tournament 4");
}

async function _seedUpcomingTournament4(admin, variants) {
    const trophy = new Trophy({
        title: "Grand Masters Trophy"
    });
    await trophy.save();

    const variant = pick(variants);

    const tournament = new Tournament({
        title: "Grand Masters Invitational 2026",
        description: "Only the elite compete here. High stakes, high rewards.",
        variantId: variant._id,
        maxPlayers: 4,
        breakDuration: 15,
        numRounds: 3,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "upcoming",
        eloMin: 1100,
        eloMax: 1400,
        standings: []
    });
    await tournament.save();

    console.log("Inserted upcoming tournament 5");
}

async function _seedOngoingTournament(admin, users, variants) {
    const trophy = new Trophy({
        title: "Easter Trophy 2026"
    });
    await trophy.save();

    const players = users.slice(0, 4).map(u => u.userId);
    const variant = pick(variants);

    const standings = players.map((userId, i) => ({
        userId,
        points: (4 - i) * variant.buyIn
    }));

    const game = new Game({
        players: [
            {
                userId: players[0],
                points: variant.buyIn,
                currentBet: 0,
                abandoned: false,
                rounds: []
            },
            {
                userId: players[1],
                points: variant.buyIn,
                currentBet: 0,
                abandoned: false,
                rounds: []
            }
        ],
        variantId: variant._id,
        pot: 0,
        status: "ongoing",
        currentRound: 1,
        currentPhase: "rolling",
        startedAt: new Date(),
        tournamentId: null
    });
    await game.save();

    const tournament = new Tournament({
        title: "Easter Invitational 2026",
        description: "An ongoing invitational tournament. Games are in progress!",
        variantId: variant._id,
        maxPlayers: 4,
        breakDuration: 5,
        numRounds: 3,
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60),
        startedAt: new Date(Date.now() - 1000 * 60 * 60),
        trophyId: trophy._id,
        createdBy: admin.userId,
        players,
        status: "ongoing",
        currentRound: 1,
        standings,
        matches: [
            {
                playerOne: players[0],
                playerTwo: players[1],
                gameId: game.gameId,
                round: 1,
                winnerId: null
            },
            {
                playerOne: players[2],
                playerTwo: players[3],
                gameId: null,
                round: 1,
                winnerId: null
            }
        ]
    });
    await tournament.save();

    await Game.updateOne(
        { gameId: game.gameId },
        { tournamentId: tournament.tournamentId }
    );

    console.log("Inserted ongoing tournament");
    return tournament;
}

async function _seedFinishedTournament(admin, users, variants) {
    const trophy = new Trophy({
        title: "Winter Break Champion Cup"
    });
    await trophy.save();

    const players = users.slice(0, 4).map(u => u.userId);
    const variant = pick(variants);
    const winner = users[0];

    const standings = [
        { userId: players[0], points: variant.buyIn * 3 },
        { userId: players[1], points: variant.buyIn * 2 },
        { userId: players[2], points: variant.buyIn },
        { userId: players[3], points: 0 }
    ];

    const tournament = new Tournament({
        title: "Winter Break Classic 2026",
        description: "The winter break classic tournament, now finished. What a great competition!",
        variantId: variant._id,
        maxPlayers: 4,
        breakDuration: 5,
        numRounds: 3,
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        finishedAt: new Date(Date.now() - 1000 * 60 * 60),
        trophyId: trophy._id,
        createdBy: admin.userId,
        players,
        status: "finished",
        currentRound: 3,
        winnerId: [winner.userId],
        standings,
        matches: [
            {
                playerOne: players[0],
                playerTwo: players[1],
                gameId: null,
                round: 1,
                winnerId: players[0]
            },
            {
                playerOne: players[2],
                playerTwo: players[3],
                gameId: null,
                round: 1,
                winnerId: players[2]
            },
            {
                playerOne: players[0],
                playerTwo: players[2],
                gameId: null,
                round: 2,
                winnerId: players[0]
            },
            {
                playerOne: players[1],
                playerTwo: players[3],
                gameId: null,
                round: 2,
                winnerId: players[1]
            },
            {
                playerOne: players[0],
                playerTwo: players[1],
                gameId: null,
                round: 3,
                winnerId: players[0]
            },
            {
                playerOne: players[2],
                playerTwo: players[3],
                gameId: null,
                round: 3,
                winnerId: players[2]
            }
        ]
    });
    await tournament.save();

    await User.updateOne(
        { userId: winner.userId },
        { $push: { trophies: { trophyId: trophy._id, awardedAt: new Date() } } }
    );

    const bonusPoints = variant.buyIn * players.length;
    await User.updateOne(
        { userId: winner.userId },
        { $inc: { points: bonusPoints } }
    );

    console.log("Inserted finished tournament and awarded trophy and bonus points to winner");
    return tournament;
}

async function _seedCancelledTournament(admin, variants) {
    const trophy = new Trophy({
        title: "Spring Cup 2026"
    });
    await trophy.save();

    const variant = pick(variants);

    const tournament = new Tournament({
        title: "Spring Cup 2026",
        description: "Unfortunately this tournament has been cancelled. We apologise for the inconvenience.",
        variantId: variant._id,
        maxPlayers: 8,
        breakDuration: 0,
        numRounds: 2,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "cancelled",
        standings: []
    });
    await tournament.save();

    console.log("Inserted cancelled tournament");
    return tournament;
}

export async function seedTournaments() {
    await Tournament.deleteMany({});
    console.log("Deleted existing tournaments");

    await Trophy.deleteMany({});
    console.log("Deleted existing trophies");

    const admins = await User.find({ role: "admin" });
    const users = await User.find({ role: "user" });
    const variants = await GameVariant.find();

    const admin = pick(admins);

    await _seedUpcomingTournament(admin, variants);
    await _seedUpcomingEloTournament(admin, variants);
    await _seedUpcomingTournament2(admin, variants);
    await _seedUpcomingTournament3(admin, variants);
    await _seedUpcomingTournament4(admin, variants);

    await _seedOngoingTournament(admin, users, variants);
    await _seedFinishedTournament(admin, users, variants);
    await _seedCancelledTournament(admin, variants);

    console.log("Inserted all tournaments");
}
