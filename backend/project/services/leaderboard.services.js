import mongoose from "mongoose";
import { Game } from "../models/game.js";

/**
 * Builds and runs an aggregation pipeline to calculate leaderboard stats
 * for all registered, non-banned users
 * Inspired by the one we made inclass, IDG2100 Fullstack 2026
 * 
 * Sorting and pagination happen inside the MongoDB pipeline instead of in 
 * JavaScript memory, which is more efficient for large datasets
 * 
 * The pipeline:
 * a) Only looks at finished games
 * b) Optionally filters by game variant
 * c) Groups stats per userId (wins, draws, total games)
 * d) Joins with the users collection to get full user info
 * e) Hides sensitive fields (pwd, _id)
 * f) Calculates win percentage and ELO change
 * g) Sorts by the requested field inside the pipeline
 * h) Paginates inside the pipeline
 * 
 * @param {string|null} variantId - Optional MongoDB ID to filter by game variant
 * @param {string} sort - Field to sort by: elo, wins, winPercentage, totalGames
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of results per page
 * @returns {Object} Object containing total count and paginated leaderboard entries
 */
export async function getLeaderboardStats(variantId = null, sort = "elo", page = 1, limit = 20) {
    // Stage 1
    // Only look at finished games
    // Optionally filter by variant
    const matchStage = {
        $match: {
            status: "finished",
            // If variantId is provided, filter by it
            ...(variantId && { variantId: new mongoose.Types.ObjectId(variantId) })
        }
    };

    // Stage 2
    // One record per player per game
    const projectStage = {
        $project: {
            players: {
                $map: {
                    input: "$players",
                    as: "player",
                    in: {
                        userId: "$$player.userId",
                        finalPoints: "$$player.finalPoints",
                        // Winner is the player with the most final points
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

    // Stage 3
    // Flatten the players array so each player gets their own document
    // Reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
    const unwindStage = {
        $unwind: { path: "$players" }
    };

    // Stage 4
    // Filter out null userIds
    const filterNullStage = {
        $match: { "players.userId": { $ne: null } }
    };

    // Stage 5
    // Group by userId and calculate stats
    // Reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
    const groupStage = {
        $group: {
            _id: "$players.userId",
            totalGames: { $sum: 1 },
            wins: { $sum: "$players.won" },
            draws: { $sum: "$players.draw" }
        }
    };

    // Stage 6
    // Calculate win percentage and losses
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

    // Stage 7
    // Join with the users collection to get full user info
    // Reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
    const lookupStage = {
        $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "userId",
            as: "user"
        }
    };

    // Stage 8
    // Flatten the user array into a single object
    const unwindUserStage = {
        $unwind: { path: "$user" }
    };

    // Stage 9
    // Filter out banned and anonymous users
    const filterUsersStage = {
        $match: {
            "user.isBanned": false,
            "user.role": { $ne: "anonymous" }
        }
    };

    // Stage 10
    // Reshape the final output
    // Hides sensitive fields and adds ELO change this week
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

    // Stage 11
    // Sort inside the pipeline
    const sortField = {
        "elo": "eloRating",
        "wins": "wins",
        "winPercentage": "winPercentage",
        "totalGames": "totalGames"
    }[sort] || "eloRating";

    const sortStage = {
        $sort: { [sortField]: -1 } // Descending, highest first
    };

    // Stage 12
    // Count total before pagination
    // Uses $facet to run two pipelines in parallel:
    // one for the total count and one for the paginated results
    // Reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
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

    // $facet always returns one document with total and data arrays
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