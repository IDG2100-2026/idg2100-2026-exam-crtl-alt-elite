/* this is basically the same code as the inclass code we've been doing from IDG2100 Fullstack 2026*/
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";

import { apiLimiter } from "./middleware/ratelimiter.js";
import { errorHandler } from "./middleware/errorhandler.js";
import apiRouter from "./routers/api.router.js";
import nonApiRouter from "./routers/non.api.router.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { initSocket } from "./websocket/socket.js";

// Sometimes it won't work if i don't include this
// might be a windows thing?
dotenv.config();

// Awaiting mongoose to connect to mongodb
await connectDB();

// Creating an express app
const app = express();

// Allow requests from the frontend dev server
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true // Required for cookies to be sent cross-origin
}));

app.use(express.json());

// Parse cookies from incoming requests
// Required for reading the refresh token cookie
app.use(cookieParser());

// Apply rate limiter to all API routes
app.use("/api", apiLimiter);

// Mounting the routes
app.use("/", nonApiRouter);
app.use("/api", nonApiRouter);
app.use("/api", apiRouter);

// Absolute path
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(join(__dirname, "uploads")));

// 404 handler, catches any request that didn't match a route
// Must be registered after all other routes and before errorHandler
app.use((req, res) => {
    res.status(404).json({ msg: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use(errorHandler);

// Create HTTP server explicitly so Socket.io can share it
// Previously app.listen() created the server implicitly
const httpServer = createServer(app);

// Attach Socket.io to the HTTP server
initSocket(httpServer);

// listening on a port
httpServer.listen(process.env.BACKEND_PORT, () => {
    console.log("the app is listening on port", process.env.BACKEND_PORT);
});

// Graceful shutdown handling
async function gracefulShutdown() {
    console.log("application is being shut down");

    await disconnectDB();
    httpServer.close(() => {
        process.exit(0);
    });
}

// Allows app to perform cleanup before shutting down
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);