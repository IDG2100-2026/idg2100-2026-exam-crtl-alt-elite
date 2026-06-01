import { io } from "socket.io-client";
import { getAccessToken } from "./api.js";

const {
    VITE_API_HOSTNAME,
    VITE_API_PORT,
    VITE_API_PROTOCOL
} = import.meta.env;

const SOCKET_URL = `${VITE_API_PROTOCOL}://${VITE_API_HOSTNAME}:${VITE_API_PORT}`;

// Stores the current socket instance
// Only one socket connection should exist at a time
let socket = null;

// Creates and returns the socket connection
// Called when the user logs in or restores their session
export function connectSocket() {
    // Don't create a new socket if one already exists and is connected
    if (socket?.connected) return socket;

    // Disconnect any existing socket before creating a new one
    // Prevents duplicate connections from StrictMode double-invoking useEffect
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    socket = io(SOCKET_URL, {
        auth: {
            // Pass the access token so the backend can authenticate the socket
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

// Returns the current socket instance
// Used by components that need to emit events or listen for messages
export function getSocket() {
    return socket;
}

// Disconnects the socket and clears the instance
// Called on logout
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}