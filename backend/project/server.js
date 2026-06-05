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

dotenv.config();

await connectDB();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
    credentials: true
}));

app.use(express.json());

app.use(cookieParser());

app.use("/api", apiLimiter);

app.use("/", nonApiRouter);
app.use("/api", nonApiRouter);
app.use("/api", apiRouter);

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(join(__dirname, "uploads")));

app.use((req, res) => {
    res.status(404).json({ msg: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use(errorHandler);

const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(process.env.BACKEND_PORT, () => {
    console.log("the app is listening on port", process.env.BACKEND_PORT);
});

async function gracefulShutdown() {
    console.log("application is being shut down");

    await disconnectDB();
    httpServer.close(() => {
        process.exit(0);
    });
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
