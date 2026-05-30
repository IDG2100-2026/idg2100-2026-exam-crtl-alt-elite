import { randomBytes } from "node:crypto";
import { User } from "../models/user.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

// How long the email verification token is valid for
import { EMAIL_VERIFICATION_EXPIRY_MS } from "../config/constants.js";

// Generates a random token for email verification
// Returns a hex string, cryptographically random
export function generateVerificationToken() {
    return randomBytes(32).toString("hex");
}

// Sets the email verification token and expiry in a user document
// Called when registering a new user or re-sending the verification email
export function setVerificationToken(user) {
    user.emailVerificationToken = generateVerificationToken();
    user.emailVerificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
    return user.emailVerificationToken;
}

// Verifies the email verification token for a user
// Returns an object with success and msg fields
export async function verifyEmail(token) {
    // Find a user with this token who hasn't verified it yet
    const user = await User.findOne({
        emailVerificationToken: token,
        emailVerified: false
    }).select("+emailVerificationToken +emailVerificationExpiry"); // Added in so it doesn't return as undefined

    if (!user) {
        return { success: false, msg: "Invalid verification token" };
    }

    // Chack if the token has expired
    if (user.emailVerificationExpiry < new Date()) {
        return { success: false, msg: "Verification token has expired" };
    }

    // Mark the user as verified and clear the token fields
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    return { success: true, msg: "Email verified successfully" };
}

// Issues a new access and refresh token pair for a user
// Stores the new refresh token in the user document
// ip is included in the access token for security incident detection
export async function issueTokens(user, ip) {
    const accessToken = signAccessToken(user.userId, user.role, ip);
    const refreshToken = signRefreshToken(user.userId);

    // Store the refresh token in the user document
    // Using updateOne to avoid triggering validation hooks
    await User.updateOne(
        { userId: user.userId },
        { refreshToken }
    );

    return { accessToken, refreshToken };
}

// Rotates the refresh token
// Verifies the incoming refresh token, checks it matches what's stored,
// and issues a new token pair
// Returns null if the token is invalid or doesn't match
export async function rotateRefreshToken(incomingRefreshToken, ip) {
    // Verify the token is a valid JWT
    const decoded = verifyRefreshToken(incomingRefreshToken);
    if (!decoded) return null;

    // Find the user and check if the stored refresh token matches
    const user = await User.findOne({ userId: decoded.userId })
        .select("+refreshToken");

    if (!user || user.refreshToken !== incomingRefreshToken) {
        // Token reuse detected, invalidate all tokens for this user
        // If the tokens don't match it may mean the token was stolen and already rotated
        if (user) {
            await User.updateOne({ userId: user.userId }, { refreshToken: null });
        }
        return null;
    }

    // Issue a new token pair
    return await issueTokens(user, ip);
}

// Clears the refresh token on logout
export async function revokeRefreshToken(userId) {
    await User.updateOne({ userId }, {refreshToken: null });
}

export default {
    generateVerificationToken,
    setVerificationToken,
    verifyEmail,
    issueTokens,
    rotateRefreshToken,
    revokeRefreshToken
};