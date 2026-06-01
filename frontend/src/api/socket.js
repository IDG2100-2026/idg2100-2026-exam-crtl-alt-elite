import { io } from "socket.io-client";
import { getAccessToken } from "./api.js";

const {
    VITE_API_HOSTNAME,
    VITE_API_PORT,
    VITE_API_PROTOCOL,
} = import.meta.env;

const SOCKET_URL = `${VITE_API_PROTOCOL}://${VITE_API_HOSTNAME}:${VITE_API_PORT}`;

let socket = null;

// Creates and returns the socket connection
// Called when the user logs in or navigates to a game page
export function connectSocket() {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        auth: {
            // Pass the access token for authentication
            token: getAccessToken()
        },
        credentials: true
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

// Returns the current socket instance
export function getSocket() {
    return socket;
}

// Disconnects the socket
// Called on logout
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}