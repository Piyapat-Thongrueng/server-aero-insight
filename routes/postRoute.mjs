import { Router } from "express";
import PostController from "../controllers/postController.mjs";
import PostValidation from "../middlewares/postValidation.mjs";
import multer from "multer";
import protectAdmin from "../middlewares/protectAdmin.mjs";
import protectUser from "../middlewares/protectUser.mjs";

const PostRouter = Router();
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
    }
  },
});

const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);

PostRouter.post("/", protectAdmin, imageFileUpload, PostValidation.postValidate, PostController.createPost);
PostRouter.get("/", PostController.getAllPosts);
PostRouter.get("/me", protectAdmin, PostController.getMyPosts);
PostRouter.get("/:postId", PostController.getPostById);
PostRouter.get("/:postId/comments", PostController.getCommentsByPostId);
PostRouter.get("/:postId/likes/me", protectUser, PostController.getMyLikeStatus);
PostRouter.post("/:postId/likes/toggle", protectUser, PostController.toggleLikePost);
PostRouter.post("/:postId/comments", protectUser, PostController.createComment);
PostRouter.put("/:postId", protectAdmin, imageFileUpload, PostValidation.postValidate, PostController.updatePost);
PostRouter.delete("/:postId", protectAdmin, PostController.deletePost);

export default PostRouter;
