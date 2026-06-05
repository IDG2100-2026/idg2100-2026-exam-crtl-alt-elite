import { randomBytes } from "node:crypto";
import { User } from "../models/user.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

import { EMAIL_VERIFICATION_EXPIRY_MS } from "../config/constants.js";

export function generateVerificationToken() {
    return randomBytes(32).toString("hex");
}

export function setVerificationToken(user) {
    user.emailVerificationToken = generateVerificationToken();
    user.emailVerificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
    return user.emailVerificationToken;
}

export async function verifyEmail(token) {
    const user = await User.findOne({
        emailVerificationToken: token,
        emailVerified: false
    }).select("+emailVerificationToken +emailVerificationExpiry");

    console.log("Verification attempt:", { token, userFound: !!user });

    if (!user) {
        return { success: false, msg: "Invalid verification token" };
    }

    if (user.emailVerificationExpiry < new Date()) {
        return { success: false, msg: "Verification token has expired" };
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    return { success: true, msg: "Email verified successfully" };
}

export async function issueTokens(user, ip) {
    const accessToken = signAccessToken(user.userId, user.role, ip);
    const refreshToken = signRefreshToken(user.userId);

    await User.updateOne(
        { userId: user.userId },
        { refreshToken }
    );

    return { accessToken, refreshToken };
}

export async function rotateRefreshToken(incomingRefreshToken, ip) {
    const decoded = verifyRefreshToken(incomingRefreshToken);
    if (!decoded) return null;

    const user = await User.findOne({ userId: decoded.userId })
        .select("+refreshToken");

    if (!user || user.refreshToken !== incomingRefreshToken) {
        if (user) {
            await User.updateOne({ userId: user.userId }, { refreshToken: null });
        }
        return null;
    }

    const tokens = await issueTokens(user, ip);

    return { ...tokens, userId: user.userId };
}

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
