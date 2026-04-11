import PostService from "../services/postService.mjs";
import { supabase } from "../utils/supabase.mjs";
import { v4 as uuidv4 } from "uuid";

const BUCKET_NAME = "aeroinsight-storage";

// Helper: ลบรูปเก่าเดิมออกจาก Supabase Storage ใน background โดยไม่บล็อก response
const deleteOldPostImage = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) return;
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf(BUCKET_NAME);
    const filePath = pathParts.slice(bucketIndex + 1).join("/");
    supabase.storage.from(BUCKET_NAME).remove([filePath]).catch((err) => {
      console.error("[STORAGE LEAK] Post image deletion failed — manual cleanup required:", err);
    });
  } catch (err) {
    console.error("[STORAGE LEAK] Failed to parse image URL for deletion:", err);
  }
};

// Helper: อัปโหลดไฟล์ภาพไป Supabase Storage และคืน public URL
const uploadPostImage = async (file, userId) => {
  const fileExt = file.mimetype.split("/")[1];
  const fileName = `${userId}-${uuidv4()}.${fileExt}`;
  const filePath = `posts/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new Error("Failed to upload image to storage");

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return publicUrl;
};

const PostController = {
  getAllPosts: async (req, res) => {
    try {
      const posts = await PostService.getAllPosts(req);
      const response = {
        totalPosts: posts.totalPosts, // จำนวน posts ทั้งหมดในระบบ
        totalPages: posts.totalPages, // จำนวนหน้าทั้งหมด
        currentPage: posts.currentPage, // หน้าปัจจุบัน
        limit: posts.limit, // จำนวน posts ต่อหน้า
        posts: posts.rows, // array ของ posts
        nextPage: posts.nextPage, // หน้าถัดไป (null ถ้าเป็นหน้าสุดท้าย)
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching posts:", error);
      return res.status(500).json({
        message: "Server could not retrieve posts due to a database error",
      });
    }
  },
  getMyPosts: async (req, res) => {
    try {
      const posts = await PostService.getMyPosts(req.user.id);
      return res.status(200).json({ posts });
    } catch (error) {
      console.error("Error fetching my posts:", error);
      return res.status(500).json({
        message: "Server could not retrieve your posts due to a database error",
      });
    }
  },
  createPost: async (req, res) => {
    const { title, category_id, description, content, status_id } = req.body;
    const user_id = req.user.id;
    const file = req.files?.imageFile?.[0];
    // ตรวจสอบว่ามีไฟล์รูปภาพแนบมาด้วยหรือไม่
    if (!file) {
      return res.status(400).json({ message: "Image file is required." });
    }
    try {
      const image = await uploadPostImage(file, user_id);
      await PostService.createPost({
        title,
        image,
        category_id,
        description,
        content,
        status_id,
        user_id,
      });
      return res.status(201).json({
        message: "Created post successfully",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      return res.status(500).json({
        message: "Server could not create post due to a database error",
      });
    }
  },
  getPostById: async (req, res) => {
    const { postId } = req.params;
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    try {
      const post = await PostService.getPostById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.status(200).json({ data: post });
    } catch (error) {
      console.error("Error fetching post by ID:", error);
      return res.status(500).json({
        message:
          "Server could not read post because database connection failed",
      });
    }
  },
  updatePost: async (req, res) => {
    const { postId } = req.params;
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const { title, category_id, description, content, status_id } = req.body;
    const file = req.files?.imageFile?.[0];
    try {
      // owner check: อนุญาตแก้ได้เฉพาะโพสต์ของ admin ที่ login อยู่
      const existingPost = await PostService.getPostByIdAndOwner(
        postId,
        req.user.id,
      );
      if (!existingPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      let image = existingPost.image; // ใช้รูปเดิมเป็นค่าเริ่มต้น
      if (file) {
        image = await uploadPostImage(file, req.user.id);
        // ลบรูปเก่าใน background หลังจากอัปโหลดรูปใหม่สำเร็จ
        deleteOldPostImage(existingPost.image);
      }

      const result = await PostService.updatePostByOwner(postId, req.user.id, {
        title,
        image,
        category_id,
        description,
        content,
        status_id,
      });

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.status(200).json({ message: "Post updated successfully" });
    } catch (error) {
      console.error("Error updating post:", error);
      return res.status(500).json({
        message: "Server could not update post due to a database error",
      });
    }
  },
  deletePost: async (req, res) => {
    const { postId } = req.params;
    try {
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      const result = await PostService.deletePostByOwner(postId, req.user.id);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post", error);
      return res.status(500).json({
        message: "Server could not delete post due to a database error",
      });
    }
  },
};

export default PostController;
