import { User } from "../models/user.js";
import { checkPwd } from "../utils/hash.js";
import { sendVerificationEmail } from "../utils/email.js";
import authServices from "../services/auth.services.js";
import { REFRESH_TOKEN_EXPIRY_MS } from "../config/constants.js";

// Cookie options reused across login and refresh endpoints
const _refreshTokenCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // Prevents CSRF attacks
    maxAge: REFRESH_TOKEN_EXPIRY_MS
};

// POST /api/auth/register
// Public, creates a new user account and sends a verification email
export async function register(req, res, next) {
    try {
        const { username, email, pwd, age } = req.validData;

        // Check if username is already taken 
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({ msg: "Username already taken" });
        }

        // Create the new user
        const user = new User({ username, email, pwd, age });

        // Generate and set the email verification token before saving
        const verificationToken = authServices.setVerificationToken(user);

        await user.save();

        // Send the verification email
        await sendVerificationEmail(user.email, verificationToken);

        // Created, but not yet verified
        res.status(201).json({
            msg: "Registration successful. Please check your email to verify your account."
        });
    } catch (err) {
        if (err.name === "ValidationError") {
            // Bad request
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
}

// POST /api/auth/login
// Public, logs in a user and issues access and refresh tokens
export async function login(req, res, next) {
    try {
        const { emailOrUsername, pwd } = req.validData;

        // Check if input looks like an email or an username
        const isEmail = emailOrUsername.includes("@");
        const user = await User.findOne(
            isEmail
                ? { email: emailOrUsername }
                : { username: emailOrUsername }
        ).select("+pwd");

        // Being vague on purpose
        if (!user) {
            // Unauthorized
            return res.status(401).json({ msg: "Invalid email/username or password" });
        }

        if (!checkPwd(pwd, user.pwd)) {
            // Unauthorized
            return res.status(401).json({ msg: "Invalid email/username or password" });
        }

        if (user.isBanned) {
            // Forbidden
            return res.status(403).json({ msg: "Your account has been banned" });
        }

        if (!user.emailVerified) {
            // Forbidden
            return res.status(403).json({ msg: "Please verify your email before logging in" });
        }

        // Issue access and refresh tokens 
        // req.ip is the client's IP address, stored in the access token
        const { accessToken, refreshToken } = await authServices.issueTokens(user, req.ip);

        // Send refresh token as httpOnly cookie
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

// POST /api/auth/refresh
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

        // Also return user info so the frontend can restore user state
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

// POST /api/auth/logout
// Registered users, clears the refresh token and cookie
export async function logout(req, res, next) {
    try {
        // Revoke the refresh token server-side
        await authServices.revokeRefreshToken(req.user.userId);

        // Clear the cookie client-side
        res.clearCookie("refreshToken");

        res.json({ msg: "Logged out successfully" });
    } catch (err) {
        next(err);
    }
}

// GET /api/auth/email-verification?token=abc123
// Public, verifies a user's email address using the token sent to their email
export async function verifyEmail(req, res, next) {
    try {
        const { token } = req.query;

        if (!token) {
            // Bad request
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

// POST /api/auth/email-verification
// Public, resends the verification email to a user
export async function resendVerification(req, res, next) {
    try {
        const { email } = req.validData;

        const user = await User.findOne({ email })
            .select("+emailVerificationToken +emailVerificationExpiry");

        // Being vague on purpose, client doesn't need to know whether the email exists or not
        if (!user || user.emailVerified) {
            return res.status(200).json({ msg: "If that email exists and is unverified, a new verification email has been sent" });
        }

        // Generate a new token and send the email
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