import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY_MS, REFRESH_TOKEN_EXPIRY_MS } from "../config/constants.js";

const {
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET
} = process.env;

// Signs a new access token
// Payload includes userId, role and the client's IP for security incident detection
export function signAccessToken(userId, role, ip) {
    return jwt.sign(
        { userId, role, ip },
        ACCESS_TOKEN_SECRET,
        { expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }
    );
}

// Signs a new refrash token
// Used to obtain new access tokens without re-logging in
export function signRefreshToken(userId) {
    return jwt.sign(
        { userId },
        REFRESH_TOKEN_SECRET,
        { expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }
    );
}

// Verifies an access token and returns the decoded payload
// Returns null if the token is invalid or expired
export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch {
        return null;
    }
}

// Verifies a refresh token and returns the decoded payload
// Returns null if the token is invalid or expired
export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch {
        return null;
    }
}