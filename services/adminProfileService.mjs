import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../utils/supabase.mjs";
import AdminProfileRepository from "../repositories/adminProfileRepository.mjs";

const BUCKET_NAME = "aeroinsight-storage";

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const sanitize = (text) => {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "");
};

const deleteOldImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) return;

  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf(BUCKET_NAME);
    const filePath = pathParts.slice(bucketIndex + 1).join("/");

    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  } catch (error) {
    console.error("Failed to delete old image:", error);
  }
};

const uploadProfileImage = async (file, userId) => {
  const fileExt = file.mimetype.split("/")[1];
  const fileName = `${userId}-${uuidv4()}.${fileExt}`;
  const filePath = `profiles/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw createError(500, "Failed to upload profile picture to storage");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return publicUrl;
};

const validateName = (name) => {
  const sanitizedName = sanitize(name);

  if (sanitizedName.length === 0 || sanitizedName.length > 100) {
    throw createError(400, "Name must be between 1 and 100 characters");
  }

  const namePattern = /^[\p{L}\s'-]+$/u;
  if (!namePattern.test(sanitizedName)) {
    throw createError(
      400,
      "Name can only contain letters, spaces, apostrophes, and hyphens",
    );
  }

  return sanitizedName;
};

const validateUsername = async (username, userId) => {
  const sanitizedUsername = sanitize(username);

  if (sanitizedUsername.length < 3 || sanitizedUsername.length > 50) {
    throw createError(400, "Username must be between 3 and 50 characters");
  }

  const usernamePattern = /^[a-zA-Z0-9_-]+$/;
  if (!usernamePattern.test(sanitizedUsername)) {
    throw createError(
      400,
      "Username can only contain letters, numbers, underscores, and hyphens",
    );
  }

  const existingUser = await AdminProfileRepository.findUserByUsernameExceptId(
    sanitizedUsername,
    userId,
  );

  if (existingUser) {
    throw createError(400, "Username is already taken");
  }

  return sanitizedUsername;
};

const validateBio = (bio) => {
  const sanitizedBio = sanitize(bio);

  if (sanitizedBio.length > 120) {
    throw createError(400, "Bio must not exceed 120 characters");
  }

  return sanitizedBio;
};

const validateImageDimensions = async (file) => {
  try {
    const metadata = await sharp(file.buffer).metadata();

    if (metadata.width < 100 || metadata.height < 100) {
      throw createError(400, "Image too small. Minimum 100x100 pixels");
    }

    if (metadata.width > 2000 || metadata.height > 2000) {
      throw createError(400, "Image too large. Maximum 2000x2000 pixels");
    }
  } catch (error) {
    if (error.status) throw error;
    throw createError(400, "Invalid image file");
  }
};

const AdminProfileService = {
  getAdminProfile: async (userId, email) => {
    const adminProfile = await AdminProfileRepository.findAdminProfileById(userId);

    if (!adminProfile) {
      throw createError(404, "Admin profile not found");
    }

    return {
      id: userId,
      email,
      username: adminProfile.username,
      name: adminProfile.name,
      role: adminProfile.role,
      profile_pic: adminProfile.profile_pic,
      bio: adminProfile.bio ?? "",
    };
  },

  updateAdminProfile: async ({ userId, name, username, bio, file }) => {
    const updates = {};

    if (name !== undefined) {
      updates.name = validateName(name);
    }

    if (username !== undefined) {
      updates.username = await validateUsername(username, userId);
    }

    if (bio !== undefined) {
      updates.bio = validateBio(bio);
    }

    if (file) {
      await validateImageDimensions(file);
      const oldImageUrl = await AdminProfileRepository.findProfilePicByUserId(userId);
      updates.profile_pic = await uploadProfileImage(file, userId);

      if (oldImageUrl) {
        deleteOldImage(oldImageUrl).catch((err) => {
          console.error(
            "[STORAGE LEAK] Background image deletion failed - manual cleanup required:",
            err,
          );
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      throw createError(400, "No fields to update provided");
    }

    const updatedUser = await AdminProfileRepository.updateAdminProfileById(
      userId,
      updates,
    );

    if (!updatedUser) {
      throw createError(404, "Admin profile not found");
    }

    return updatedUser;
  },
};

export default AdminProfileService;
