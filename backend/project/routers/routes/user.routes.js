import express from "express";
import { identifyUser, requireUser, requireAdmin } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import userController from "../../controllers/user.controller.js";
import userValidator from "../../validators/user.validator.js";
import uploadMiddleware from "../../middleware/uploads.js";

const userRouter = express.Router();

userRouter.use(identifyUser);

userRouter.get("/:id", requireUser, userValidator.validateUserId(), validate, userController.getUser);
userRouter.put("/:id",
    requireUser,
    userValidator.validateUserId(),
    validate,
    userValidator.validateUpdateUser(),
    validate,
    userController.updateUser
);
userRouter.put(
    "/:id/avatar",
    requireUser,
    userValidator.validateUserId(),
    validate,
    uploadMiddleware.uploadAvatar.single("avatar"),
    userController.uploadAvatar
);

userRouter.get("/", requireAdmin, userValidator.validateGetUsers(), validate, userController.getAllUsers);
userRouter.put("/:id/ban", requireAdmin, userValidator.validateUserId(), validate, userController.banUser);
userRouter.put("/:id/unban", requireAdmin, userValidator.validateUserId(), validate, userController.unbanUser);
userRouter.put("/:id/role", requireAdmin, userValidator.validateUserId(), validate, userController.makeAdmin);

export default userRouter;
