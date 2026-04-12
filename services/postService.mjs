import PostRepository from "../repositories/postRepository.mjs";

const PostService = {
  getAllPosts: async (req) => {
    let categoryParam = req.query.category;
    let keywordParam = req.query.keyword;
    const requestedPage = Number.parseInt(req.query.page, 10);
    const pageParam = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
    const PAGE_SIZE = 6;
    const offset = (pageParam - 1) * PAGE_SIZE;

    // ถ้า category เป็นสตริงว่าง ให้กำหนดเป็น null แทน
    if (typeof categoryParam !== "string" || categoryParam.trim() === "") {
      categoryParam = null;
    } else {
      categoryParam = categoryParam.trim();
    }
    // ถ้า keyword เป็นสตริงว่าง ให้กำหนดเป็น null แทน
    if (typeof keywordParam !== "string" || keywordParam.trim() === "") {
      keywordParam = null;
    } else {
      keywordParam = keywordParam.trim();
    }

    return await PostRepository.findAllPosts({
      category: categoryParam,
      keyword: keywordParam,
      limit: PAGE_SIZE,
      offset: offset,
    });
  },
  createPost: async (postData) => {
    return await PostRepository.createPost(postData);
  },
  getMyPosts: async (userId) => {
    return await PostRepository.findPostsByAuthor({ userId });
  },
  getPostById: async (postId) => {
    return await PostRepository.findPostById(postId);
  },
  getPostByIdAndOwner: async (postId, userId) => {
    return await PostRepository.findPostByIdAndOwner(postId, userId);
  },
  updatePostByOwner: async (postId, userId, postData) => {
    return await PostRepository.updatePostByOwner(postId, userId, postData);
  },
  updatePost: async (postId, postData) => {
    return await PostRepository.updatePost(postId, postData);
  },
  deletePostByOwner: async (postId, userId) => {
    return await PostRepository.deletePostByOwner(postId, userId);
  },
  deletePost: async (postId) => {
    return await PostRepository.deletePost(postId);
  },
  getUserLikeStatus: async (postId, userId) => {
    return await PostRepository.getUserLikeStatus(postId, userId);
  },
  toggleLikePost: async (postId, userId) => {
    return await PostRepository.toggleLikePost(postId, userId);
  },
  getCommentsByPostId: async (postId) => {
    return await PostRepository.findCommentsByPostId(postId);
  },
  createComment: async (postId, userId, commentText) => {
    const normalizedComment = String(commentText || "").trim();

    if (!normalizedComment) {
      const error = new Error("Comment text is required");
      error.status = 400;
      throw error;
    }

    if (normalizedComment.length > 2000) {
      const error = new Error("Comment text must not exceed 2000 characters");
      error.status = 400;
      throw error;
    }

    return await PostRepository.createComment({
      postId,
      userId,
      commentText: normalizedComment,
    });
  },
};

export default PostService;
