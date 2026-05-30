import express from "express";
import { identifyUser, requireAdmin } from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import adminController from "../../controllers/admin.controller.js";
import adminValidator from "../../validators/admin.validator.js";

const adminRouter = express.Router();

adminRouter.use(identifyUser);
adminRouter.use(requireAdmin);

// All routes in this file require admin access
// requireAdmin is applied to the whole router above

// GET /api/admin/dashboard
adminRouter.get("/dashboard", adminController.getDashboard);

// GET /api/admin/incidents
adminRouter.get(
    "/incidents", 
    adminValidator.validateGetIncidents(),
    validate,
    adminController.getSecurityIncidents
);

export default adminRouter;