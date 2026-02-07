import { Router } from "express";
import PostController from "../controllers/postController.mjs";
import PostValidation from "../middlewares/postValidation.mjs";

const PostRouter = Router();

PostRouter.post("/", PostValidation.postValidate, PostController.createPost);
PostRouter.get("/", PostController.getAllPosts);

export default PostRouter;
