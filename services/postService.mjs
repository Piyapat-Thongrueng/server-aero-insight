import PostRepository from "../repositories/postRepository.mjs";

const PostService = {
  getAllPosts: async () => {
    return await PostRepository.findAllPosts();
  },
  createPost: async (postData) => {
    return await PostRepository.createPost(postData);
  },
  getPostById: async (postId) => {
    return await PostRepository.findPostById(postId);
  },
  updatePost: async (postId, postData) => {
    return await PostRepository.updatePost(postId, postData);
  },
  deletePost: async (postId) => {
    return await PostRepository.deletePost(postId);
  },

};

export default PostService;
