import mongoose from "mongoose";
import { Game } from "../models/game.js";

export async function getLeaderboardStats(variantId = null, sort = "elo", page = 1, limit = 20) {
    const matchStage = {
        $match: {
            status: "finished",
            ...(variantId && { variantId: new mongoose.Types.ObjectId(variantId) })
        }
    };

    const projectStage = {
        $project: {
            players: {
                $map: {
                    input: "$players",
                    as: "player",
                    in: {
                        userId: "$$player.userId",
                        finalPoints: "$$player.finalPoints",
                        won: {
                            $cond: [
                                { $eq: ["$$player.userId", { $arrayElemAt: ["$winnerId", 0] }] },
                                1,
                                0
                            ]
                        },
                        draw: {
                            $cond: [
                                { $gt: [{ $size: "$winnerId" }, 1] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        }
    };

    const unwindStage = {
        $unwind: { path: "$players" }
    };

    const filterNullStage = {
        $match: { "players.userId": { $ne: null } }
    };

    const groupStage = {
        $group: {
            _id: "$players.userId",
            totalGames: { $sum: 1 },
            wins: { $sum: "$players.won" },
            draws: { $sum: "$players.draw" }
        }
    };

    const addFieldStage = {
        $addFields: {
            losses: { $subtract: ["$totalGames", { $add: ["$wins", "$draws"] }] },
            winPercentage: {
                $cond: [
                    { $gt: ["$totalGames", 0] },
                    { $round: [{ $multiply: [{ $divide: ["$wins", "$totalGames"] }, 100] }, 0] },
                    0
                ]
            }
        }
    };

    const lookupStage = {
        $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "userId",
            as: "user"
        }
    };

    const unwindUserStage = {
        $unwind: { path: "$user" }
    };

    const filterUsersStage = {
        $match: {
            "user.isBanned": false,
            "user.role": { $ne: "anonymous" }
        }
    };

    const finalProjectStage = {
        $project: {
            _id: 0,
            userId: "$_id",
            username: "$user.username",
            eloRating: "$user.eloRating",
            eloChangeThisWeek: { $subtract: ["$user.eloRating", "$user.eloRatingLastWeek"] },
            totalGames: 1,
            wins: 1,
            losses: 1,
            draws: 1,
            winPercentage: 1
        }
    };

    const sortField = {
        "elo": "eloRating",
        "wins": "wins",
        "winPercentage": "winPercentage",
        "totalGames": "totalGames"
    }[sort] || "eloRating";

    const sortStage = {
        $sort: { [sortField]: -1 }
    };

    const facetStage = {
        $facet: {
            total: [{ $count: "count" }],
            data: [
                { $skip: (page - 1) * limit },
                { $limit: limit }
            ]
        }
    };

    const results = await Game.aggregate([
        matchStage,
        projectStage,
        unwindStage,
        filterNullStage,
        groupStage,
        addFieldStage,
        lookupStage,
        unwindUserStage,
        filterUsersStage,
        finalProjectStage,
        sortStage,
        facetStage
    ]);

    const total = results[0]?.total[0]?.count || 0;
    const data = results[0]?.data || [];

    return {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        leaderboard: data
    };
}

export default {
    getLeaderboardStats
};
