import PostRepository from "../repositories/postRepository.mjs";

const PostService = {
  getAllPosts: async (req) => {
    let categoryParam = req.query.category;
    let keywordParam = req.query.keyword;
    const pageParam = parseInt(req.query.page) || 1;
    const PAGE_SIZE = 6;
    const offset = (pageParam - 1) * PAGE_SIZE;

    // ถ้า category เป็นสตริงว่าง ให้กำหนดเป็น null แทน
    if (typeof categoryParam !== "string" || categoryParam.trim() === "") {
      categoryParam = null;
    }
    // ถ้า keyword เป็นสตริงว่าง ให้กำหนดเป็น null แทน
    if (typeof keywordParam !== "string" || keywordParam.trim() === "") {
      keywordParam = null;
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
};

export default PostService;
