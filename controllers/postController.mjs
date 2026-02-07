import PostService from "../services/postService.mjs";

const PostController = {
  getAllPosts: async (req, res) => {
    try {
      const posts = await PostService.getAllPosts();
      return res.status(200).json({ data: posts.rows });
    } catch (error) {
      console.error("Error fetching posts:", error);
      return res.status(500).json({
        message: "Server could not retrieve posts due to a database error",
      });
    }
  },
};

export default PostController;
