import connectionPool from "../utils/db.mjs";

const PostRepository = {
  findAllPosts: async () => {
    return await connectionPool.query("SELECT * FROM posts");
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
