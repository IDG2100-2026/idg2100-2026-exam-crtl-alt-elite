import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/user.js";
import { SecurityIncident } from "../models/securityIncident.js";

export async function socketAuth(socket, next) {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            socket.user = { role: "anonymous" };
            return next();
        }

        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return next(new Error("Invalid or expired access token"));
        }

        if (decoded.ip !== socket.handshake.address) {
            try {
                await SecurityIncident.create({
                    type: "ip_mismatch",
                    userId: decoded.userId,
                    ip: socket.handshake.address,
                    userAgent: socket.handshake.headers["user-agent"],
                    detail: `Token IP: ${decoded.ip}, WebSocket IP: ${socket.handshake.address}`
                });
            } catch (err) {
                console.error("Failed to log WebSocket IP mismatch incident:", err.message);
            }
            return next(new Error("IP mismatch detected"));
        }

        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            return next(new Error("User not found"));
        }

        if (user.isBanned) {
            return next(new Error("Your account has been banned"));
        }

        socket.user = user;
        next();
    } catch (err) {
        console.error("Socket auth error:", err.message);
        next(new Error("Authentication failed"));
    }
}
