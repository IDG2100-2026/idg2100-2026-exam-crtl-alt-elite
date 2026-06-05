import rateLimit from "express-rate-limit";
import { SecurityIncident } from "../models/securityIncident.js";

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { msg: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
        try {
            await SecurityIncident.create({
                type: "rate_limit",
                userId: req.user?.userId || null,
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                detail: `Rate limit exceeded on ${req.method} ${req.originalUrl}`
            });
        } catch (err) {
            console.error("Failed to log rate limit incident:", err.message);
        }
        res.status(429).json({ msg: "Too many requests, please try again later" });
    }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { msg: "Too many login attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false
});

export const matchmakeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { msg: "Too many matchmaking requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false
});
