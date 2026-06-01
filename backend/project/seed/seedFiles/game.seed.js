import { Game } from "../../models/game.js";
import { User } from "../../models/user.js";
import { GameVariant } from "../../models/gameVariant.js";

// Returns a random element from an array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Seeds finished games with the new players array structure
// Each game has between 2 and 5 players depending on the variant
async function _seedFinishedGames(users, variants) {
    const gameDocs = [];

    for (let i = 0; i < 10; i++) {
        const variant = pick(variants);
        const numPlayers = variant.numPlayers;

        // Pick the required number of players for this variant
        // Using modulo to cycle through users array without repeating
        const gamePlayers = [];
        for (let j = 0; j < numPlayers; j++) {
            const user = users[(i + j) % users.length];

            // Give each player random final points between 0 and buyIn * 3
            const finalPoints = Math.floor(Math.random() * variant.buyIn * 3);

            gamePlayers.push({
                userId: user.userId,
                points: finalPoints,
                currentBet: 0,
                abandoned: false,
                rounds: [],
                finalPoints
            });
        }

        // Winner is the player with the most final points
        const maxPoints = Math.max(...gamePlayers.map(p => p.finalPoints));
        const winners = gamePlayers
            .filter(p => p.finalPoints === maxPoints)
            .map(p => p.userId);

        gameDocs.push(new Game({
            players: gamePlayers,
            variantId: variant._id,
            pot: 0,
            status: "finished",
            currentRound: variant.rounds,
            currentPhase: "reveal",
            winnerId: winners,
            startedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            finishedAt: new Date()
        }));
    }

    await Promise.all(gameDocs.map(g => g.save()));
    console.log(`Inserted ${gameDocs.length} finished games`);
}

// Seeds ongoing games with the new players array structure
async function _seedOngoingGames(users, variants) {
    const gameDocs = [];

    for (let i = 0; i < 3; i++) {
        const variant = pick(variants);
        const numPlayers = variant.numPlayers;

        // Offset by 2 to avoid same pairings as finished games
        const gamePlayers = [];
        for (let j = 0; j < numPlayers; j++) {
            const user = users[(i + j + 2) % users.length];

            gamePlayers.push({
                userId: user.userId,
                points: variant.buyIn,
                currentBet: 0,
                abandoned: false,
                rounds: []
            });
        }

        gameDocs.push(new Game({
            players: gamePlayers,
            variantId: variant._id,
            pot: 0,
            status: "ongoing",
            currentRound: 1,
            currentPhase: "rolling",
            startedAt: new Date()
        }));
    }

    await Promise.all(gameDocs.map(g => g.save()));
    console.log(`Inserted ${gameDocs.length} ongoing games`);
}

// Seeds room games waiting for players to join
async function _seedRoomGames(users, variants) {
    const gameDocs = [];

    for (let i = 0; i < 4; i++) {
        const variant = pick(variants);

        // Room games only have one player - the creator
        const creator = users[i % users.length];

        gameDocs.push(new Game({
            players: [{
                userId: creator.userId,
                points: variant.buyIn,
                currentBet: 0,
                abandoned: false,
                rounds: []
            }],
            variantId: variant._id,
            pot: 0,
            status: "room",
            currentRound: 1,
            currentPhase: "rolling"
        }));
    }

    await Promise.all(gameDocs.map(g => g.save()));
    console.log(`Inserted ${gameDocs.length} room games`);
}

// Clears existing games and seeds new ones
// Fetches users and variants once and passes them to each helper
export async function seedGames() {
    await Game.deleteMany({});
    console.log("Deleted existing games");

    // Fetch once and pass down to avoid multiple DB calls
    const insertedUsers = await User.find({ role: "user" });
    const insertedVariants = await GameVariant.find();

    await _seedFinishedGames(insertedUsers, insertedVariants);
    await _seedOngoingGames(insertedUsers, insertedVariants);
    await _seedRoomGames(insertedUsers, insertedVariants);
    console.log("Added games");
}