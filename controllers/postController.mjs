import PostService from "../services/postService.mjs";

const PostController = {
  getAllPosts: async (req, res) => {
    try {
      const posts = await PostService.getAllPosts(req);
      const response = {
        totalPosts: posts.totalPosts, // จำนวน posts ทั้งหมดในระบบ
        totalPages: posts.totalPages, // จำนวนหน้าทั้งหมด
        currentPage: posts.currentPage, // หน้าปัจจุบัน
        limit: posts.limit, // จำนวน posts ต่อหน้า
        posts: posts.rows, // array ของ posts
        nextPage: posts.nextPage, // หน้าถัดไป (null ถ้าเป็นหน้าสุดท้าย)
      };

      return res.status(200).json(response);
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
  getPostById: async (req, res) => {
    const { postId } = req.params;
    try {
      const post = await PostService.getPostById(postId);
      if (post.rows.length === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.status(200).json({ data: post.rows[0] });
    } catch (error) {
      console.error("Error fetching post by ID:", error);
      return res.status(500).json({
        message:
          "Server could not read post because database connection failed",
      });
    }
  },
  updatePost: async (req, res) => {
    const { postId } = req.params;
    const { title, image, category_id, description, content, status_id } =
      req.body;
    try {
      const result = await PostService.updatePost(postId, {
        title,
        image,
        category_id,
        description,
        content,
        status_id,
      });
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.status(200).json({ message: "Post updated successfully" });
    } catch (error) {
      console.error("Error updating post:", error);
      return res.status(500).json({
        message: "Server could not update post due to a database error",
      });
    }
  },
  deletePost: async (req, res) => {
    const { postId } = req.params;
    try {
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      const result = await PostService.deletePost(postId);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post", error);
      return res.status(500).json({
        message: "Server could not delete post due to a database error",
      });
    }
  },
};

export default PostController;
