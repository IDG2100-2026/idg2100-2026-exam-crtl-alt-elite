import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/user.js";
import { SecurityIncident } from "../models/securityIncident.js";

// Middleware to authenticate WebSocket connections
// Runs before any event handlers, same as identifyUser in the REST API
// Uses the same JWT access token as the REST API
export async function socketAuth(socket, next) {
    try {
        const token = socket.handshake.auth?.token;

        // Allow unauthenticated connections for spectators
        if (!token) {
            socket.user = { role: "anonymous" };
            return next();
        }

        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return next(new Error("Invalid or expired access token"));
        }

        // Check IP matches token
        // socket.handshake.address is the client's ip
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

        // Fetch the full user document
        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            return next(new Error("User not found"));
        }

        if (user.isBanned) {
            return next(new Error("Your account has been banned"));
        }

        // Attach user to socket for use in event handlers
        socket.user = user;
        next();
    } catch (err) {
        console.error("Socket auth error:", err.message);
        next(new Error("Authentication failed"));
    }
}