import { getLeaderboardStats } from "../services/leaderboard.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

export async function getLeaderBoard(req, res, next) {
    try {
        const { sort = "elo", page = PAGE, limit = LIMIT, variantId } = req.query;

        const leaderboard = await getLeaderboardStats(variantId, sort, Number(page), Number(limit));

        res.json({
            page: Number(page),
            limit: Number(limit),
            sort,
            leaderboard
        });
    } catch(err) {
        next(err);
    }
}

export default {
    getLeaderBoard
};
