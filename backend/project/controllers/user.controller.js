import { User } from "../models/user.js";
import userServices from "../services/user.services.js";

import {
    PAGE,
    LIMIT
} from "../config/constants.js";

// GET /api/users
// Admin only, returns a paginated, searchable list of all users
export async function getAllUsers(req, res, next) {
    try {
        // Pagination
        const { page = PAGE, limit = LIMIT, search = "" } = req.query;

        // Search filter, searches username and email
        const filter = userServices.buildSearchFilter(search);

        // Find users using the filter
        const users = await User.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Count all the user documents in the collection, using the filter
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

// GET /api/users/:id
// Registered users, returns a single user profile by userId
export async function getUser(req, res, next) {
    try {
        // Find the user based on userId
        const user = await userServices.findUserById(req.validData.id);

        // If the userId is not valid
        if(!user) {
            // Not found
            return res.status(404).json({ msg: "User was not found" });
        }

        // Populate recentGames and trophies with full documents
        await user.populate("recentGames"); // Swap ObjectIds for full game documents
        await user.populate("trophies.trophyId"); // Swap trophyIds for full trophy documents

        res.json(user);
    } catch(err) {
        next(err);
    }
}

// PUT /api/users/:id
// Registered users, they can update their own profile except for their username
export async function updateUser(req, res, next) {
    try {
        // Finding the user based on the userId
        const user = await userServices.findUserById(req.validData.id);

        if(!user) {
            // Not found
            return res.status(404).json({ msg: "User was not found" });
        }

        // Users can only update their own profile
        if (user.userId !== req.user.userId) {
            // Forbidden
            return res.status(403).json({ msg: "Excuse you, you can only update your own profile" });
        }

        // Only updating fields that were actually sent
        userServices.applyUserUpdates(user, req.validData);

        // Saving the changes the user made
        await user.save();
        res.json(user);
    } catch(err) {
        if (err.name === "ValidationError") {
            // Bad request
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

// PUT /api/users/:id/avatar
// Registered users, they can upload a profile picture for their own profile
// File validation is handled by multer middleware in the route
export async function uploadAvatar(req, res, next) {
    try {
        // Finding the user based on the userId
        const user = await userServices.findUserById(req.params.id);

        if (!user) {
            // Not found
            return res.status(404).json({ msg: "User was not found" });
        }

        // Users can only update their own avatar
        if (user.userId !== req.user.userId) {
            // Forbidden
            return res.status(403).json({ msg: "You can only update your own avatar" });
        }

        // req.file is set by multer middleware, if missing, no file was sent
        if (!req.file) {
            // Bad request
            return res.status(400).json({ msg: "No image provided" });
        }

        // Use updateOne to avoid triggering email uniqueness validator
        await User.updateOne(
            { userId: user.userId },
            { avatar: req.file.path }
        );

        // Return the new avatar path so the frontend can update immediately
        res.json({ msg: "Avatar updated!", avatar: req.file.path });
    } catch (err) {
        next(err);
    }
}

// PUT /api/users/:id/ban
// Admin only, they can ban a user
export async function banUser(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if(!user) {
            // Not found
            return res.status(404).json({ msg: "User was not found. Need one to ban one" });
        }

        if (user.role === "admin") {
            // Forbidden
            return res.status(403).json({ msg: "Admins can't be banned" });
        }

        // Sets the user to being banned
        await User.updateOne({ userId: user.userId }, { isBanned: true });

        res.json({ msg: `User ${user.username} has been banned` });
    } catch(err) {
        next(err);
    }
}

// PUT /api/users/:id/unban
// Admin only, lifts a ban from a user
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

// PUT /api/users/:id/role
// Admin only, promotes a user to admin
export async function makeAdmin(req, res, next) {
    try {
        const user = await userServices.findUserById(req.validData.id);

        if(!user) {
            // Not found
            return res.status(404).json({ msg: "User was not found" });
        }

        if (user.role === "admin") {
            // Bad request
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