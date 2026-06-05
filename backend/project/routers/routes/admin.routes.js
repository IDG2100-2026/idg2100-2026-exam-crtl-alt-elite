import express from "express";
import { identifyUser, requireAdmin } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import adminController from "../../controllers/admin.controller.js";
import adminValidator from "../../validators/admin.validator.js";

const adminRouter = express.Router();

adminRouter.use(identifyUser);
adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", adminController.getDashboard);

adminRouter.get(
    "/incidents",
    adminValidator.validateGetIncidents(),
    validate,
    adminController.getSecurityIncidents
);

export default adminRouter;
