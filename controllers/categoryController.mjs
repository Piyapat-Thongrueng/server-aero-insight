import CategoryService from "../services/categoryService.mjs";

const handleError = (res, error, fallbackMessage) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  // ตรวจสอบ foreign key constraint: category ถูกใช้งานอยู่ใน posts ลบไม่ได้
  if (error.code === "23503") {
    return res.status(400).json({
      message:
        "Cannot delete this category because it is used by existing articles",
    });
  }

  console.error("Category controller error:", error);
  return res.status(500).json({ message: fallbackMessage });
};

const CategoryController = {
  getAllCategories: async (req, res) => {
    try {
      const categories = await CategoryService.getAllCategories();
      return res.status(200).json({ data: categories });
    } catch (error) {
      return handleError(res, error, "Failed to fetch categories");
    }
  },

  createCategory: async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const category = await CategoryService.createCategory(name);

      return res.status(201).json({
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      return handleError(res, error, "Failed to create category");
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const category = await CategoryService.updateCategory(
        Number(categoryId),
        name,
      );

      return res.status(200).json({
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      return handleError(res, error, "Failed to update category");
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const category = await CategoryService.deleteCategory(
        Number(categoryId),
      );

      return res.status(200).json({
        message: "Category deleted successfully",
        data: category,
      });
    } catch (error) {
      return handleError(res, error, "Failed to delete category");
    }
  },
};

export default CategoryController;
