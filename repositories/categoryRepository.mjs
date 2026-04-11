import connectionPool from "../utils/db.mjs";

const CategoryRepository = {
  findAllCategories: async () => {
    const { rows } = await connectionPool.query(
      "SELECT id, name FROM categories ORDER BY id ASC",
    );
    return rows;
  },

  // ใช้ COALESCE($2, -1) เพื่อให้ใช้งานได้ทั้งกรณี create (excludeId = null) และ edit (excludeId = id จริง)
  findCategoryByNameExceptId: async (name, excludeId = null) => {
    const { rows } = await connectionPool.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != COALESCE($2, -1)",
      [name, excludeId],
    );
    return rows[0] || null;
  },

  createCategory: async (name) => {
    const { rows } = await connectionPool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id, name",
      [name],
    );
    return rows[0];
  },

  updateCategory: async (id, name) => {
    const { rows } = await connectionPool.query(
      "UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name",
      [name, id],
    );
    return rows[0] || null;
  },

  deleteCategory: async (id) => {
    const { rows } = await connectionPool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING id, name",
      [id],
    );
    return rows[0] || null;
  },
};

export default CategoryRepository;
