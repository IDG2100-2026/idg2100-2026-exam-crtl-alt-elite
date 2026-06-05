import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/user.js";
import { SecurityIncident } from "../models/securityIncident.js";

export async function identifyUser(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = { role: "anonymous" };
        return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
        return res.status(401).json({ msg: "Invalid or expired access token" });
    }

    if (decoded.ip !== req.ip) {
        try {
            await SecurityIncident.create({
                type: "ip_mismatch",
                userId: decoded.userId,
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                detail: `Token IP: ${decoded.ip}, Request IP: ${req.ip}`
            });
        } catch (err) {
            console.error("Failed to log security incident:", err.message);
        }
        return res.status(401).json({ msg: "Security incident detected, please log in again" });
    }

    let user;
    try {
        user = await User.findOne({ userId: decoded.userId });
    } catch (err) {
        return next(err);
    }

    if (!user) {
        return res.status(401).json({ msg: "User no longer exists" });
    }

    if (user.isBanned) {
        return res.status(403).json({ msg: "Your account has been banned" });
    }

    req.user = user;
    next();
}

export function requireUser(req, res, next) {
    if (req.user.role === "anonymous") {
        return res.status(401).json({ msg: "You must be logged in to do this" });
    }
    next();
}

export function requireVerified(req, res, next) {
    if (!req.user.emailVerified) {
        return res.status(403).json({ msg: "You must verify your email before doing this" });
    }
    next();
}

export function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ msg: "You must be an admin to do this" });
    }
    next();
}

export default {
    identifyUser,
    requireUser,
    requireVerified,
    requireAdmin
};
