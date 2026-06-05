import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY_MS, REFRESH_TOKEN_EXPIRY_MS } from "../config/constants.js";

const {
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET
} = process.env;

export function signAccessToken(userId, role, ip) {
    return jwt.sign(
        { userId, role, ip },
        ACCESS_TOKEN_SECRET,
        { expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }
    );
}

export function signRefreshToken(userId) {
    return jwt.sign(
        { userId },
        REFRESH_TOKEN_SECRET,
        { expiresIn: Math.floor(REFRESH_TOKEN_EXPIRY_MS / 1000) }
    );
}

export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch {
        return null;
    }
}
