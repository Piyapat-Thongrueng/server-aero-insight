import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import connectionPool from "../utils/db.mjs";
import protectUser from "../middlewares/protectUser.mjs";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const profileRouter = Router();

// ✅เก็บไฟล์รูปภาพในแรมของเซิร์ฟเวอร์ เช็คขนาดและประเภทไฟล์ก่อนอัปโหลดไปยัง Supabase Storage
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
    }
  },
});

// ✅ อัพโหดรูปภาพจากฟอร์มที่มีชื่อฟิลด์ "imageFile" และจำกัดจำนวนไฟล์ที่อัพโหลดได้เป็น 1 ไฟล์ต่อคำขอ
// .fields() จะช่วยให้เราสามารถจัดการกับหลายฟิลด์ที่มีไฟล์ได้ในครั้งเดียว แต่ในกรณีนี้เรากำหนดแค่ฟิลด์เดียวคือ "imageFile"
const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);

// ✅ Helper function: Sanitize text
const sanitize = (text) => {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "");
};

// ✅ Helper function: Delete old image
const deleteOldImage = async (imageUrl, bucketName) => {
  if (!imageUrl || !imageUrl.includes(bucketName)) return;

  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf(bucketName);
    const filePath = pathParts.slice(bucketIndex + 1).join("/");

    await supabase.storage.from(bucketName).remove([filePath]);
  } catch (error) {
    console.error("Failed to delete old image:", error);
  }
};

profileRouter.put("/", [imageFileUpload, protectUser], async (req, res) => {
  const { id: userId } = req.user;
  const { name, username } = req.body;
  const file = req.files?.imageFile?.[0];

  try {
    const updates = {};

    // ============================================
    // 1. VALIDATE NAME
    // ============================================
    if (name !== undefined) {
      const sanitizedName = sanitize(name);

      if (sanitizedName.length === 0 || sanitizedName.length > 100) {
        return res.status(400).json({
          message: "Name must be between 1 and 100 characters",
        });
      }

      const namePattern = /^[a-zA-Z\s'-]+$/;
      if (!namePattern.test(sanitizedName)) {
        return res.status(400).json({
          message:
            "Name can only contain letters, spaces, apostrophes, and hyphens",
        });
      }

      updates.name = sanitizedName;
    }

    // ============================================
    // 2. VALIDATE USERNAME
    // ============================================
    if (username !== undefined) {
      const sanitizedUsername = sanitize(username);

      if (sanitizedUsername.length < 3 || sanitizedUsername.length > 50) {
        return res.status(400).json({
          message: "Username must be between 3 and 50 characters",
        });
      }

      const usernamePattern = /^[a-zA-Z0-9_-]+$/;
      if (!usernamePattern.test(sanitizedUsername)) {
        return res.status(400).json({
          message:
            "Username can only contain letters, numbers, underscores, and hyphens",
        });
      }

      // ✅ Check uniqueness
      const existingUser = await connectionPool.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [sanitizedUsername, userId],
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          message: "Username is already taken",
        });
      }

      updates.username = sanitizedUsername;
    }

    // ============================================
    // 3. VALIDATE AND PROCESS IMAGE
    // ============================================
    if (file) {
      // ✅ Validate dimensions
      try {
        const metadata = await sharp(file.buffer).metadata();

        if (metadata.width < 100 || metadata.height < 100) {
          return res.status(400).json({
            message: "Image too small. Minimum 100x100 pixels",
          });
        }

        if (metadata.width > 2000 || metadata.height > 2000) {
          return res.status(400).json({
            message: "Image too large. Maximum 2000x2000 pixels",
          });
        }
      } catch (error) {
        return res.status(400).json({
          message: "Invalid image file",
        });
      }

      // ✅ Get old image URL
      const oldUserData = await connectionPool.query(
        "SELECT profile_pic FROM users WHERE id = $1",
        [userId],
      );
      const oldImageUrl = oldUserData.rows[0]?.profile_pic;

      // Upload new image
      const bucketName = "aeroinsight-storage";
      const fileExt = file.mimetype.split("/")[1];
      const fileName = `${userId}-${uuidv4()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw new Error("Failed to upload profile picture to storage");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(data.path);

      updates.profile_pic = publicUrl;

      // ✅ Delete old image (async)
      if (oldImageUrl) {
        deleteOldImage(oldImageUrl, bucketName).catch((err) => {
          console.error("Background image deletion failed:", err);
        });
      }
    }

    // ============================================
    // 4. CHECK IF ANY UPDATES
    // ============================================
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No fields to update provided",
      });
    }

    // ============================================
    // 5. UPDATE DATABASE
    // ============================================
    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      fieldsToUpdate.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }

    values.push(userId);

    const query = `
      UPDATE users 
      SET ${fieldsToUpdate.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, username, name, role, profile_pic
    `;

    const { rows } = await connectionPool.query(query, values);

    return res.status(200).json({
      message: "Profile updated successfully",
      user: rows[0],
    });
  } catch (err) {
    console.error("Profile update error:", err);

    // ✅ Classify errors
    if (
      err.message.includes("Username") ||
      err.message.includes("Name") ||
      err.message.includes("Invalid") ||
      err.message.includes("too small") ||
      err.message.includes("too large") ||
      err.message.includes("Only JPEG")
    ) {
      return res.status(400).json({
        message: err.message,
      });
    }

    if (err.message.includes("Storage") || err.message.includes("upload")) {
      return res.status(500).json({
        message: "Failed to upload image. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
});

export default profileRouter;
