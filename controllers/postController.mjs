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
  createPost: async (req, res) => {
    const { title, image, category_id, description, content, status_id } =
      req.body;
    try {
      await PostService.createPost({
        title,
        image,
        category_id,
        description,
        content,
        status_id,
      });
      return res.status(201).json({
        message: "Created post successfully",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      return res.status(500).json({
        message: "Server could not create post due to a database error",
      });
    }
  },
};

export default PostController;
