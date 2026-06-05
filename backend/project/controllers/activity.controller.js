import { Game } from "../models/game.js";
import { User } from "../models/user.js";

export async function getActivity(req, res, next) {
    try {
        const ongoingGames = await Game.countDocuments({
            status: "ongoing"
        });

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const activeUsersThisWeek = await User.countDocuments({
            updatedAt: { $gte: oneWeekAgo },
            role: { $ne: "anonymous" }
        });

        const lastGames = await Game.find({ status: "finished" })
            .populate("variantId")
            .sort({ finishedAt: -1 })
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
