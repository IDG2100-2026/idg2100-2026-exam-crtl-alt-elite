import { User } from "../models/user.js";
import { checkPwd } from "../utils/hash.js";
import { sendVerificationEmail } from "../utils/email.js";
import authServices from "../services/auth.services.js";
import { REFRESH_TOKEN_EXPIRY_MS } from "../config/constants.js";

const _refreshTokenCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_EXPIRY_MS
};

export async function register(req, res, next) {
    try {
        const { username, email, pwd, age } = req.validData;

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({ msg: "Username already taken" });
        }

        const user = new User({ username, email, pwd, age });

        const verificationToken = authServices.setVerificationToken(user);

        await user.save();

        await sendVerificationEmail(user.email, verificationToken);

        res.status(201).json({
            msg: "Registration successful. Please check your email to verify your account."
        });
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

export async function login(req, res, next) {
    try {
        const { emailOrUsername, pwd } = req.validData;

        const isEmail = emailOrUsername.includes("@");
        const user = await User.findOne(
            isEmail
                ? { email: emailOrUsername }
                : { username: emailOrUsername }
        ).select("+pwd");

        if (!user) {
            return res.status(401).json({ msg: "Invalid email/username or password" });
        }

        if (!checkPwd(pwd, user.pwd)) {
            return res.status(401).json({ msg: "Invalid email/username or password" });
        }

        if (user.isBanned) {
            return res.status(403).json({ msg: "Your account has been banned" });
        }

        if (!user.emailVerified) {
            try {
                const verificationToken = authServices.setVerificationToken(user);
                await user.save();
                await sendVerificationEmail(user.email, verificationToken);
            } catch (err) {
                console.error("Failed to resend verification email on login attempt:", err.message);
            }

            return res.status(403).json({
                msg: "Please verify your email before logging in. A new verification email has been sent."
            });
        }

        const { accessToken, refreshToken } = await authServices.issueTokens(user, req.ip);

        res.cookie("refreshToken", refreshToken, _refreshTokenCookieOptions);

        res.json({
            msg: "Login successful",
            accessToken,
            userId: user.userId,
            username: user.username,
            role: user.role
        });
    } catch (err) {
        next(err);
    }
}

export async function refresh(req, res, next) {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({ msg: "No refresh token provided" });
        }

        const tokens = await authServices.rotateRefreshToken(incomingRefreshToken, req.ip);

        if (!tokens) {
            res.clearCookie("refreshToken");
            return res.status(401).json({ msg: "Invalid or expired refresh token" });
        }

        res.cookie("refreshToken", tokens.refreshToken, _refreshTokenCookieOptions);

        const user = await User.findOne({ userId: tokens.userId });

        res.json({
            accessToken: tokens.accessToken,
            userId: user.userId,
            username: user.username,
            role: user.role
        });
    } catch (err) {
        next(err);
    }
}

export async function logout(req, res, next) {
    try {
        await authServices.revokeRefreshToken(req.user.userId);

        res.clearCookie("refreshToken");

        res.json({ msg: "Logged out successfully" });
    } catch (err) {
        next(err);
    }
}

export async function verifyEmail(req, res, next) {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ msg: "Verification token is required" });
        }

        const result = await authServices.verifyEmail(token);

        if (!result.success) {
            return res.status(400).json({ msg: result.msg });
        }

        res.json({ msg: result.msg });
    } catch (err) {
        next(err);
    }
}

export async function resendVerification(req, res, next) {
    try {
        const { email } = req.validData;

        const user = await User.findOne({ email })
            .select("+emailVerificationToken +emailVerificationExpiry");

        if (!user || user.emailVerified) {
            return res.status(200).json({ msg: "If that email exists and is unverified, a new verification email has been sent" });
        }

        const verificationToken = authServices.setVerificationToken(user);
        await user.save();
        await sendVerificationEmail(user.email, verificationToken);

        res.json({ msg: "If that email exists and is unverified, a new verification email has been sent" });
    } catch (err) {
        next(err);
    }
}

export default {
    register,
    login,
    refresh,
    logout,
    verifyEmail,
    resendVerification
};
