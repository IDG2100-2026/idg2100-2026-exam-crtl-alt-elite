import jwt from "jsonwebtoken";

const {
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY
} = process.env;

// Signs a new access token
// Payload includes userId, role and the client's IP for security incident detection
export function signAccessToken(userId, role, ip) {
    return jwt.sign(
        { userId, role, ip },
        ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

// Signs a new refrash token
// Used to obtain new access tokens without re-logging in
export function signRefreshToken(userId) {
    return jwt.sign(
        { userId },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
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