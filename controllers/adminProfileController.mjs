import AdminProfileService from "../services/adminProfileService.mjs";

const handleError = (res, error, fallbackMessage) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message, error: error.message });
  }

  console.error("Admin profile controller error:", error);
  return res.status(500).json({ message: fallbackMessage });
};

const AdminProfileController = {
  getAdminProfile: async (req, res) => {
    try {
      const profile = await AdminProfileService.getAdminProfile(
        req.user.id,
        req.user.email,
      );

      return res.status(200).json(profile);
    } catch (error) {
      return handleError(res, error, "Failed to fetch admin profile");
    }
  },

  updateAdminProfile: async (req, res) => {
    try {
      const file = req.files?.imageFile?.[0];
      const updatedUser = await AdminProfileService.updateAdminProfile({
        userId: req.user.id,
        name: req.body.name,
        username: req.body.username,
        bio: req.body.bio,
        file,
      });

      return res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      return handleError(res, error, "Failed to update profile");
    }
  },
};

export default AdminProfileController;
