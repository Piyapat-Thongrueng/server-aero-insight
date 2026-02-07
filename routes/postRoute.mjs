import { Router } from "express";
import PostController from "../controllers/postController.mjs";
import PostValidation from "../middlewares/postValidation.mjs";

const PostRouter = Router();

PostRouter.post("/", PostValidation.postValidate, PostController.createPost);
PostRouter.get("/", PostController.getAllPosts);
PostRouter.get("/:postId", PostController.getPostById);
PostRouter.put("/:postId", PostValidation.postValidate, PostController.updatePost);
PostRouter.delete("/:postId", PostController.deletePost);


export default PostRouter;
