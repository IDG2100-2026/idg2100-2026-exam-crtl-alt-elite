import { getLeaderboardStats } from "../services/leaderboard.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

// GET /api/leaderboard
// Public, returns a ranked list of users
// Supports sorting by: ELO (default), wins, winPercentage, totalGames
// Supports filtering by variantId
// Sorting and pagination are now handled inside the MongoDB pipeline for better performance
export async function getLeaderBoard(req, res, next) {
    try {
        const { sort = "elo", page = PAGE, limit = LIMIT, variantId } = req.query;

        // Fetch stats using the aggregation pipeline
        // Sorting and pagination handled in the pipeline, not in memory
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