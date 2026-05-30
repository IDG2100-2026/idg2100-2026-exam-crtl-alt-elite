import { GameVariant } from "../models/gameVariant.js";

// GET /api/variants
// (one example, 5 rounds, straights allowed): GET /api/variants?rounds=5&straightsAllowed=true
// Public, returns all 162 game variants
export async function getAllVariants(req, res, next) {
    try {
        const { rounds, straightsAllowed, timeControl, numPlayers, buyIn } = req.query;

        // Filter to get the exact game variant you want
        const filter = {};
        // Adding variants to the filter
        if (rounds) filter.rounds = Number(rounds);
        if (straightsAllowed !== undefined) filter.straightsAllowed = straightsAllowed === "true";
        if (timeControl) filter.timeControl = Number(timeControl);
        if (numPlayers) filter.numPlayers = Number(numPlayers);
        if (buyIn) filter.buyIn = Number(buyIn);

        const variants = await GameVariant.find(filter);
        res.json(variants);
    } catch (err) {
        next(err);
    }
}

export default {
    getAllVariants
};