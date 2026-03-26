import { Router } from "express";
import PostController from "../controllers/postController.mjs";
import PostValidation from "../middlewares/postValidation.mjs";
import multer from "multer";
import protectAdmin from "../middlewares/protectAdmin.mjs";

const PostRouter = Router();
const multerUpload = multer({ storage: multer.memoryStorage() });

const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);

PostRouter.post("/", protectAdmin, imageFileUpload, PostValidation.postValidate, PostController.createPost);
PostRouter.get("/", PostController.getAllPosts);
PostRouter.get("/:postId", PostController.getPostById);
PostRouter.put("/:postId", protectAdmin, imageFileUpload, PostValidation.postValidate, PostController.updatePost);
PostRouter.delete("/:postId", protectAdmin, PostController.deletePost);

export default PostRouter;
