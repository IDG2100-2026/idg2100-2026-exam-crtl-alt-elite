import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/user.js";
import { SecurityIncident } from "../models/securityIncident.js";

// Identifies the user from the Authorization header
// Sets req.user to the decoded token payload if valid
// Falls back to anonymous if no token is provided
export async function identifyUser(req, res, next) {
    const authHeader = req.headers["authorization"];

    // No token provided, treat as anon
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = { role: "anonymous" };
        return next();
    }

    // Extract the token from "Bearer <token>"
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    // Token is invalid or expired
    if (!decoded) {
        // Unauthorized
        return res.status(401).json({ msg: "Invalid or expired access token" });
    }

    // Check if the IP in the token matches the current request IP
    // If not, log a security incident and reject the request
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
            // Log but don't block the incident logging failure
            console.error("Failed to log security incident:", err.message);
        }
        return res.status(401).json({ msg: "Security incident detected, please log in again" });
    }

    // Check the user still exists and isn't banned
    // Wrapped in try/catch so a DB failure propagates to the error handler instead of crashing the process
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
        // Forbidden
        return res.status(403).json({ msg: "Your account has been banned" });
    }

    // Attach the full user to the request for use in controllers
    req.user = user;
    next();
}

// For routes that anonymous users can't access
export function requireUser(req, res, next) {
    if (req.user.role === "anonymous") {
        return res.status(401).json({ msg: "You must be logged in to do this" });
    }
    next();
}

// For routes that require email verification
// Called after requireUser
export function requireVerified(req, res, next) {
    if (!req.user.emailVerified) {
        return res.status(403).json({ msg: "You must verify your email before doing this" });
    }
    next();
}

// For routes that only admins can access
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