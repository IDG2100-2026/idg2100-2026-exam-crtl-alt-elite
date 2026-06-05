import express from "express";
import { identifyUser, requireUser, requireAdmin } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import commentController from "../../controllers/comment.controller.js";
import commentValidator from "../../validators/comment.validator.js";

const commentRouter = express.Router();

commentRouter.use(identifyUser);

commentRouter.get("/", commentValidator.validateGetComments(), validate, commentController.getComments);

commentRouter.post("/", requireUser, commentValidator.validateCreateComment(), validate, commentController.createComment);

commentRouter.get("/recent", requireAdmin, commentValidator.validateGetRecentComments(), validate, commentController.getRecentComments);

commentRouter.delete("/:id", requireAdmin, commentValidator.validateCommentId(), validate, commentController.deleteComment);

export default commentRouter;
