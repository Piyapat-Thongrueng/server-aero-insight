import connectionPool from "../utils/db.mjs";

const PostRepository = {
  findAllPosts: async () => {
    return await connectionPool.query("SELECT * FROM posts");
  },
};

export default PostRepository;
