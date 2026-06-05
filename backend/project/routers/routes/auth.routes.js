import express from "express";
import { authLimiter } from "../../middleware/ratelimiter.js";
import { identifyUser, requireUser } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import authController from "../../controllers/auth.controller.js";
import authValidator from "../../validators/auth.validator.js";

const authRouter = express.Router();

authRouter.use(identifyUser);

authRouter.post(
    "/register",
    authLimiter,
    authValidator.validateRegister(),
    validate,
    authController.register
);

authRouter.post(
    "/login",
    authLimiter,
    authValidator.validateLogin(),
    validate,
    authController.login
);

authRouter.post("/refresh", authController.refresh);

authRouter.get("/email-verification", authController.verifyEmail);

authRouter.post(
    "/email-verification",
    authLimiter,
    authValidator.validateResendVerification(),
    validate,
    authController.resendVerification
);

authRouter.post("/logout", requireUser, authController.logout);

export default authRouter;
