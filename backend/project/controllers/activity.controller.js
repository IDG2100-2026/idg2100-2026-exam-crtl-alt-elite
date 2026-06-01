import { Game } from "../models/game.js";
import { User } from "../models/user.js";

// GET /api/activity
// Public, returns a snapshot of current platform activity
export async function getActivity(req, res, next) {
    try {
        // Number of ongoing games right now
        const ongoingGames = await Game.countDocuments({
            status: "ongoing"
        });

        // Number of active users this week
        // User is considered active if they have played a game in the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Finds active users by searching through when someone was last active
        const activeUsersThisWeek = await User.countDocuments({
            updatedAt: { $gte: oneWeekAgo }, // Greater than or equal to, https://www.mongodb.com/docs/manual/reference/operator/aggregation/gte/
            role: { $ne: "anonymous" } // Not equal to, https://www.mongodb.com/docs/manual/reference/operator/query/ne/
        });

        // Last 10 finished games on the platform
        const lastGames = await Game.find({ status: "finished" })
            .populate("variantId")
            .sort({ finishedAt: -1 }) // Most recently finished first
            .limit(10);

        res.json({
            ongoingGames,
            activeUsersThisWeek,
            lastGames
        });
    } catch (err) {
        next(err);
    }
}

export default {
    getActivity
};