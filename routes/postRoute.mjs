import { Router } from "express";
import PostController from "../controllers/postController.mjs";

const PostRouter = Router();

PostRouter.get("/", PostController.getAllPosts);

export default PostRouter;
