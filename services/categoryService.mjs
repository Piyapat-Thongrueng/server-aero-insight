import CategoryRepository from "../repositories/categoryRepository.mjs";

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const sanitize = (text) =>
  text.trim().replace(/\s+/g, " ").replace(/<[^>]*>/g, "");

const validateName = async (name, excludeId = null) => {
  const sanitized = sanitize(name);

  if (!sanitized || sanitized.length === 0) {
    throw createError(400, "Category name is required");
  }

  if (sanitized.length > 100) {
    throw createError(400, "Category name must not exceed 100 characters");
  }

  const existing = await CategoryRepository.findCategoryByNameExceptId(
    sanitized,
    excludeId,
  );

  if (existing) {
    throw createError(400, "Category name already exists");
  }

  return sanitized;
};

const CategoryService = {
  getAllCategories: async () => {
    return await CategoryRepository.findAllCategories();
  },

  createCategory: async (name) => {
    const validatedName = await validateName(name);
    return await CategoryRepository.createCategory(validatedName);
  },

  updateCategory: async (id, name) => {
    const validatedName = await validateName(name, id);
    const updated = await CategoryRepository.updateCategory(id, validatedName);

    if (!updated) {
      throw createError(404, "Category not found");
    }

    return updated;
  },

  deleteCategory: async (id) => {
    const deleted = await CategoryRepository.deleteCategory(id);

    if (!deleted) {
      throw createError(404, "Category not found");
    }

    return deleted;
  },
};

export default CategoryService;
