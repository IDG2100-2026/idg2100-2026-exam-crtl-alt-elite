import { User } from "../models/user.js";
import { Game } from "../models/game.js";
import { SecurityIncident } from "../models/securityIncident.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

export async function getDashboard(req, res, next) {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const newProfilesThisWeek = await User.countDocuments({
            createdAt: { $gte: oneWeekAgo },
            role: { $ne: "anonymous" }
        });

        const ongoingGames = await Game.countDocuments({
            status: "ongoing"
        });

        const activePlayersThisWeek = await User.countDocuments({
            updatedAt: { $gte: oneWeekAgo },
            role: { $ne: "anonymous" }
        });

        const gamesPlayedThisWeek = await Game.countDocuments({
            status: "finished",
            finishedAt: { $gte: oneWeekAgo }
        });

        const recentIncidents = await SecurityIncident.find({})
            .sort({ createdAt: -1 })
            .limit(20);

        const ipMismatchCount = await SecurityIncident.countDocuments({
            type: "ip_mismatch"
        });

        const rateLimitCount = await SecurityIncident.countDocuments({
            type: "rate_limit"
        });

        res.json({
            platformActivity: {
                newProfilesThisWeek,
                ongoingGames,
                activePlayersThisWeek,
                gamesPlayedThisWeek
            },
            securityIncidents: {
                total: recentIncidents.length,
                ipMismatchCount,
                rateLimitCount,
                recent: recentIncidents
            }
        });
    } catch (err) {
        next(err);
    }
}

export async function getSecurityIncidents(req, res, next) {
    try {
        const { page = PAGE, limit = LIMIT, type } = req.query;

        const filter = {};
        if (type) filter.type = type;

        const incidents = await SecurityIncident.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await SecurityIncident.countDocuments(filter);

        res.json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            incidents
        });
    } catch (err) {
        next(err);
    }
}

export default {
    getDashboard,
    getSecurityIncidents
};
