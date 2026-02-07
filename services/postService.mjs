import PostRepository from "../repositories/postRepository.mjs";

const PostService = {
  getAllPosts: async () => {
    return await PostRepository.findAllPosts();
  },
  createPost: async (postData) => {
    return await PostRepository.createPost(postData);
  },
};

export default PostService;
