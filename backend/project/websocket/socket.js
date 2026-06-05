import { Server } from "socket.io";
import { socketAuth } from "../middleware/socketAuth.js";
import { registerGameHandlers } from "./gameSocket.js";
import { registerCommentHandlers } from "./commentSocket.js";

let io;

export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use(socketAuth);

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}, user: ${socket.user?.username || "anonymous"}`);

        if (socket.user?.userId) {
            socket.join(`user:${socket.user.userId}`);
        }

        registerGameHandlers(io, socket);
        registerCommentHandlers(io, socket);

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
}

export function getIO() {
    if (!io) throw new Error("Socket.io has not been initialised");
    return io;
}
