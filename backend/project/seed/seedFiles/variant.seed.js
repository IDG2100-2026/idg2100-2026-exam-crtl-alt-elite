import { GameVariant } from "../../models/gameVariant.js";

import {
    MIN_ROUNDS,
    MIDRANGE_ROUNDS,
    MAX_ROUNDS,
    MIN_TIME,
    MIDRANGE_TIME,
    MAX_TIME,
    MIN_PLAYERS_PER_GAME,
    MID_PLAYERS_PER_GAME,
    MAX_PLAYERS_PER_GAME,
    MIN_BUYIN,
    MID_BUYIN,
    MAX_BUYIN
} from "../../config/constants.js";

// Generates all 162 game variant combinations
// 3 round options x 2 straights options x 3 time options x 3 player options x 3 buy-in options
export async function seedVariants() {
    await GameVariant.deleteMany({});
    console.log("Deleted the existing game variants");

    const roundOptions = [MIN_ROUNDS, MIDRANGE_ROUNDS, MAX_ROUNDS];
    const timeOptions = [MIN_TIME, MIDRANGE_TIME, MAX_TIME];
    const straightsOptions = [true, false];
    const playerOptions = [MIN_PLAYERS_PER_GAME, MID_PLAYERS_PER_GAME, MAX_PLAYERS_PER_GAME];
    const buyInOptions = [MIN_BUYIN, MID_BUYIN, MAX_BUYIN];

    // The flatMap() method maps all array elements and creates a new flat array
    // https://www.w3schools.com/jsref/jsref_array_flatmap.asp
    // Generates every combination of all 5 dimensions
    const variants = roundOptions.flatMap(r =>
        timeOptions.flatMap(t =>
            straightsOptions.flatMap(s =>
                playerOptions.flatMap(p =>
                    buyInOptions.map(b => ({
                        rounds: r,
                        timeControl: t,
                        straightsAllowed: s,
                        numPlayers: p,
                        buyIn: b
                    }))
                )
            )
        )
    );

    await GameVariant.insertMany(variants);
    console.log(`Inserted all ${variants.length} game variants`);
}