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
};

export default PostRepository;
