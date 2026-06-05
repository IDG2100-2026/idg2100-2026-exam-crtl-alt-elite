import { User } from "../models/user.js";
import { Game } from "../models/game.js";
import userServices from "../services/user.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

export async function getAllUsers(req, res, next) {
    try {
        const { page = PAGE, limit = LIMIT, search = "" } = req.query;

        const filter = userServices.buildSearchFilter(search);

        const users = await User.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments(filter);

        res.json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            users
        });
    } catch(err) {
        next(err);
    }
}

export async function getUser(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if(!user) {
            return res.status(404).json({ msg: "User was not found" });
        }

        await user.populate("recentGames");
        await user.populate("trophies.trophyId");

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const recentFinished = await Game.find({
            status: "finished",
            finishedAt: { $gte: oneMonthAgo },
            "players.userId": user.userId
        }, { winnerId: 1 });

        let winsLastMonth = 0, lossesLastMonth = 0, drawsLastMonth = 0;
        for (const game of recentFinished) {
            if (game.winnerId.includes(user.userId)) {
                game.winnerId.length === 1 ? winsLastMonth++ : drawsLastMonth++;
            } else {
                lossesLastMonth++;
            }
        }

        res.json({ ...user.toJSON(), winsLastMonth, lossesLastMonth, drawsLastMonth });
    } catch(err) {
        next(err);
    }
}

export async function updateUser(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if(!user) {
            return res.status(404).json({ msg: "User was not found" });
        }

        if (user.userId !== req.user.userId) {
            return res.status(403).json({ msg: "Excuse you, you can only update your own profile" });
        }

        userServices.applyUserUpdates(user, req.validData);

        await user.save();
        res.json(user);
    } catch(err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

export async function uploadAvatar(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if (!user) {
            return res.status(404).json({ msg: "User was not found" });
        }

        if (user.userId !== req.user.userId) {
            return res.status(403).json({ msg: "You can only update your own avatar" });
        }

        if (!req.file) {
            return res.status(400).json({ msg: "No image provided" });
        }

        await User.updateOne(
            { userId: user.userId },
            { avatar: req.file.path }
        );

        res.json({ msg: "Avatar updated!", avatar: req.file.path });
    } catch (err) {
        next(err);
    }
}

export async function banUser(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if(!user) {
            return res.status(404).json({ msg: "User was not found. Need one to ban one" });
        }

        if (user.role === "admin") {
            return res.status(403).json({ msg: "Admins can't be banned" });
        }

        await User.updateOne({ userId: user.userId }, { isBanned: true });

        res.json({ msg: `User ${user.username} has been banned` });
    } catch(err) {
        next(err);
    }
}

export async function unbanUser(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        await User.updateOne({ userId: user.userId }, { isBanned: false });

        res.json({ msg: `User ${user.username} has been unbanned` });
    } catch (err) {
        next(err);
    }
}

export async function makeAdmin(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if(!user) {
            return res.status(404).json({ msg: "User was not found" });
        }

        if (user.role === "admin") {
            return res.status(400).json({ msg: "User is already an admin" });
        }

        await User.updateOne({ userId: user.userId }, { role: "admin" });

        res.json({ msg: `User ${user.username} is now an admin` });
    } catch(err) {
        next(err);
    }
}

export default {
    getAllUsers,
    getUser,
    updateUser,
    uploadAvatar,
    banUser,
    unbanUser,
    makeAdmin
};
