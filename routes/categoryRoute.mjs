import { Router } from "express";
import protectAdmin from "../middlewares/protectAdmin.mjs";
import CategoryController from "../controllers/categoryController.mjs";

const categoryRouter = Router();

// GET เปิด public เพราะ landing page ต้องแสดง category filter ด้วย
categoryRouter.get("/", CategoryController.getAllCategories);

// POST / PUT / DELETE ต้องเป็น admin เท่านั้น
categoryRouter.post("/", protectAdmin, CategoryController.createCategory);
categoryRouter.put(
  "/:categoryId",
  protectAdmin,
  CategoryController.updateCategory,
);
categoryRouter.delete(
  "/:categoryId",
  protectAdmin,
  CategoryController.deleteCategory,
);

export default categoryRouter;
