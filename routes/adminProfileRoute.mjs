import { Router } from "express";
import protectAdmin from "../middlewares/protectAdmin.mjs";
import imageFileUpload from "../middlewares/adminProfileUpload.mjs";
import AdminProfileController from "../controllers/adminProfileController.mjs";

const adminProfileRouter = Router();
adminProfileRouter.get(
  "/",
  protectAdmin,
  AdminProfileController.getAdminProfile,
);
adminProfileRouter.put(
  "/",
  protectAdmin,
  imageFileUpload,
  AdminProfileController.updateAdminProfile,
);

export default adminProfileRouter;
