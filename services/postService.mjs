import PostRepository from "../repositories/postRepository.mjs";

const PostService = {
  getAllPosts: async () => {
    return await PostRepository.findAllPosts();
  },
};

export default PostService;
