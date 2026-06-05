import { GameVariant } from "../models/gameVariant.js";

export async function getAllVariants(req, res, next) {
    try {
        const { rounds, straightsAllowed, timeControl, numPlayers, buyIn } = req.query;

        const filter = {};
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
