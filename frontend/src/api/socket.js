import { io } from "socket.io-client";
import { getAccessToken } from "./api.js";

const {
    VITE_API_HOSTNAME,
    VITE_API_PORT,
    VITE_API_PROTOCOL
} = import.meta.env;

const SOCKET_URL = `${VITE_API_PROTOCOL}://${VITE_API_HOSTNAME}:${VITE_API_PORT}`;

let socket = null;

export function connectSocket() {
    if (socket?.connected) return socket;

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    socket = io(SOCKET_URL, {
        auth: {
            token: getAccessToken()
        },
        credentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected");
    });

    socket.on("error", (err) => {
        console.error("Socket error:", err.msg);
    });

    return socket;
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
