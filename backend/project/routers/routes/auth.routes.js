import express from "express";
import { authLimiter } from "../../middleware/ratelimiter.js";
import { identifyUser, requireUser } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import authController from "../../controllers/auth.controller.js";
import authValidator from "../../validators/auth.validator.js";

const authRouter = express.Router();

// Apply identifyUser to all auth routes
authRouter.use(identifyUser);

/* Public */
// POST /api/auth/register
authRouter.post(
    "/register",
    authLimiter,
    authValidator.validateRegister(),
    validate,
    authController.register
);

// POST /api/auth/login
authRouter.post(
    "/login",
    authLimiter,
    authValidator.validateLogin(),
    validate,
    authController.login
);

// POST /api/auth/refresh
authRouter.post("/refresh", authController.refresh);

// GET /api/auth/email-verification?token=...
authRouter.get("/email-verification", authController.verifyEmail);

// POST /api/auth/email-verification
authRouter.post(
    "/email-verification",
    authLimiter,
    authValidator.validateResendVerification(),
    validate,
    authController.resendVerification
);

/* Registered users only */
// POST /api/auth/logout
authRouter.post("/logout", requireUser, authController.logout);

export default authRouter;