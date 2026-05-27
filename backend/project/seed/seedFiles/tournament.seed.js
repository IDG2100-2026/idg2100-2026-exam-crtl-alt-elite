import { Tournament } from "../../models/tournament.js";
import { Trophy } from "../../models/trophy.js";
import { User } from "../../models/user.js";
import { GameVariant } from "../../models/gameVariant.js";
import { Game } from "../../models/game.js";

// Returns a random element from an array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Seeds an upcoming tournament
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
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1 week from now
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "upcoming",
        standings: []
    });
    await tournament.save();

    console.log("Inserted upcoming tournament");
    return tournament;
}

// Seeds an upcoming tournament with ELO restrictions
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
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 2 weeks from now
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "upcoming",
        eloMin: 1000,
        eloMax: 1400,
        standings: []
    });
    await tournament.save();

    console.log("Inserted upcoming ELO restricted tournament");
    return tournament;
}

// Seeds an ongoing tournament with players and matches
async function _seedOngoingTournament(admin, users, variants) {
    const trophy = new Trophy({
        title: "Easter Trophy 2026"
    });
    await trophy.save();

    // Use first 4 users as players
    const players = users.slice(0, 4).map(u => u.userId);
    const variant = pick(variants);

    // Create standings with some points already accumulated
    const standings = players.map((userId, i) => ({
        userId,
        points: (4 - i) * variant.buyIn // Decreasing points for variety
    }));

    // Create game for round 1 match
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
        tournamentId: null // Will be set after tournament is created
    });
    await game.save();

    const tournament = new Tournament({
        title: "Easter Invitational 2026",
        description: "An ongoing invitational tournament. Games are in progress!",
        variantId: variant._id,
        maxPlayers: 4,
        breakDuration: 5,
        numRounds: 3,
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60), // Started 1 hour ago
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

    // Update game with tournamentId
    await Game.updateOne(
        { gameId: game.gameId },
        { tournamentId: tournament.tournamentId }
    );

    console.log("Inserted ongoing tournament");
    return tournament;
}

// Seeds a finished tournament with a winner and awarded trophy
async function _seedFinishedTournament(admin, users, variants) {
    const trophy = new Trophy({
        title: "Winter Break Champion Cup"
    });
    await trophy.save();

    const players = users.slice(0, 4).map(u => u.userId);
    const variant = pick(variants);
    const winner = users[0];

    // Final standings - winner has most points
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
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        finishedAt: new Date(Date.now() - 1000 * 60 * 60), // Finished 1 hour ago
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

    // Award trophy to winner
    await User.updateOne(
        { userId: winner.userId },
        { $push: { trophies: { trophyId: trophy._id, awardedAt: new Date() } } }
    );

    // Award bonus points to winner
    // Formula: buyIn * numberOfPlayers
    const bonusPoints = variant.buyIn * players.length;
    await User.updateOne(
        { userId: winner.userId },
        { $inc: { points: bonusPoints } }
    );

    console.log("Inserted finished tournament and awarded trophy and bonus points to winner");
    return tournament;
}

// Seeds a cancelled tournament
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
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
        trophyId: trophy._id,
        createdBy: admin.userId,
        status: "cancelled",
        standings: []
    });
    await tournament.save();

    console.log("Inserted cancelled tournament");
    return tournament;
}

// Clears existing tournaments and trophies and seeds new ones
export async function seedTournaments() {
    await Tournament.deleteMany({});
    console.log("Deleted existing tournaments");

    await Trophy.deleteMany({});
    console.log("Deleted existing trophies");

    // Fetch once and pass down to avoid multiple DB calls
    const admins = await User.find({ role: "admin" });
    const users = await User.find({ role: "user" });
    const variants = await GameVariant.find();

    // Pick a random admin
    const admin = pick(admins);

    await _seedUpcomingTournament(admin, variants);
    await _seedUpcomingEloTournament(admin, variants);
    await _seedOngoingTournament(admin, users, variants);
    await _seedFinishedTournament(admin, users, variants);
    await _seedCancelledTournament(admin, variants);

    console.log("Inserted all tournaments");
}