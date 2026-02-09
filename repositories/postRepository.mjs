import connectionPool from "../utils/db.mjs";

const PostRepository = {
  findAllPosts: async (filters) => {
    let { category, keyword, limit, offset } = filters;
    // Query สำหรับนับจำนวนทั้งหมด
    let countQuery = "SELECT COUNT(*) FROM posts";
    let countValues = [];
    let query = "SELECT * FROM posts";
    let values = [];

    if (category && keyword) {
      const whereClause = " WHERE category ILIKE $1 AND keyword ILIKE $2";
      countQuery += whereClause;
      countValues = [`%${category}%`, `%${keyword}%`];

      query += whereClause + " LIMIT $3 OFFSET $4";
      values = [`%${category}%`, `%${keyword}%`, limit, offset];
    } else if (category) {
      const whereClause = " WHERE category ILIKE $1";
      countQuery += whereClause;
      countValues = [`%${category}%`];

      query += whereClause + " LIMIT $2 OFFSET $3";
      values = [`%${category}%`, limit, offset];
    } else if (keyword) {
      const whereClause = " WHERE keyword ILIKE $1";
      countQuery += whereClause;
      countValues = [`%${keyword}%`];

      query += whereClause + " LIMIT $2 OFFSET $3";
      values = [`%${keyword}%`, limit, offset];
    } else {
      query += " LIMIT $1 OFFSET $2";
      values = [limit, offset];
    }
    // Execute queries
    const countResult = await connectionPool.query(countQuery, countValues);
    const postsResult = await connectionPool.query(query, values);

    const totalPosts = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPosts / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return {
      totalPosts,
      totalPages,
      currentPage,
      limit,
      rows: postsResult.rows,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
    };
  },
  createPost: async (postData) => {
    return await connectionPool.query(
      "INSERT INTO posts (title, image, category_id, description, content, status_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        postData.title,
        postData.image,
        postData.category_id,
        postData.description,
        postData.content,
        postData.status_id,
      ],
    );
  },
  findPostById: async (postId) => {
    return await connectionPool.query("SELECT * FROM posts WHERE id = $1", [
      postId,
    ]);
  },
  updatePost: async (postId, postData) => {
    return await connectionPool.query(
      "UPDATE posts SET title = $1, image = $2, category_id = $3, description = $4, content = $5, status_id = $6 WHERE id = $7",
      [
        postData.title,
        postData.image,
        postData.category_id,
        postData.description,
        postData.content,
        postData.status_id,
        postId,
      ],
    );
  },
  deletePost: async (postId) => {
    return await connectionPool.query("DELETE FROM posts WHERE id = $1", [
      postId,
    ]);
  },
};

export default PostRepository;
