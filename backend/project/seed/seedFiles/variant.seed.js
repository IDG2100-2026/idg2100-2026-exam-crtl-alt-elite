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

export async function seedVariants() {
    await GameVariant.deleteMany({});
    console.log("Deleted the existing game variants");

    const roundOptions = [MIN_ROUNDS, MIDRANGE_ROUNDS, MAX_ROUNDS];
    const timeOptions = [MIN_TIME, MIDRANGE_TIME, MAX_TIME];
    const straightsOptions = [true, false];
    const playerOptions = [MIN_PLAYERS_PER_GAME, MID_PLAYERS_PER_GAME, MAX_PLAYERS_PER_GAME];
    const buyInOptions = [MIN_BUYIN, MID_BUYIN, MAX_BUYIN];

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
