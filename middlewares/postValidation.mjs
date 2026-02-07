const PostValidation = {
  postValidate: (req, res, next) => {
    const { title, image, category_id, description, content, status_id } =
      req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required." });
    }
    if (!image || image.trim() === "") {
      return res.status(400).json({ error: "Image URL is required." });
    }
    if (!category_id || isNaN(category_id)) {
      return res.status(400).json({ error: "Valid category ID is required." });
    }
    if (!description || description.trim() === "") {
      return res.status(400).json({ error: "Description is required." });
    }
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Content is required." });
    }
    if (!status_id || isNaN(status_id)) {
      return res.status(400).json({ error: "Valid status ID is required." });
    }
    if (title && typeof title !== "string") {
      return res.status(400).json({ error: "Title must be a string." });
    }
    if (image && typeof image !== "string") {
      return res.status(400).json({ error: "Image URL must be a string." });
    }
    if (description && typeof description !== "string") {
      return res.status(400).json({ error: "Description must be a string." });
    }
    if (content && typeof content !== "string") {
      return res.status(400).json({ error: "Content must be a string." });
    }
    next();
  },
};
export default PostValidation;
