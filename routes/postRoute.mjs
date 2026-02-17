import { Router } from "express";
import PostController from "../controllers/postController.mjs";
import PostValidation from "../middlewares/postValidation.mjs";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const PostRouter = Router();
const multerUpload = multer({ storage: multer.memoryStorage() });

const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);

PostRouter.post("/", PostValidation.postValidate, PostController.createPost);
PostRouter.get("/", PostController.getAllPosts);
PostRouter.get("/:postId", PostController.getPostById);
PostRouter.put("/:postId",PostValidation.postValidate,PostController.updatePost,
);
PostRouter.delete("/:postId", PostController.deletePost);

export default PostRouter;
