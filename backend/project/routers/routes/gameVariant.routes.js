import express from "express";
import gameVariantController from "../../controllers/gameVariant.controller.js";
import gameVariantValidator from "../../validators/gameVariant.validator.js";
import validate from "../../middleware/validate.js";

const gameVariantRouter = express.Router();

gameVariantRouter.get(
    "/",
    gameVariantValidator.validateGetVariants(),
    validate,
    gameVariantController.getAllVariants
);

export default gameVariantRouter;
