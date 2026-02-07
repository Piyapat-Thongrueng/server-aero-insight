import "dotenv/config";
import express from "express";
import cors from "cors";
import connectionPool from "./utils/db.mjs";
import PostRouter from "./routes/postRoute.mjs";

const app = express();
const PORT = process.env.PORT || 4000;
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Frontend local (Vite)
      "http://localhost:3000", // Frontend local (React แบบอื่น)
      "https://aero-insight.vercel.app", // Frontend ที่ Deploy แล้ว
      // ✅ ให้เปลี่ยน https://your-frontend.vercel.app เป็น URL จริงของ Frontend ที่ deploy แล้ว
    ],
  }),
);
app.use("/posts", PostRouter);

app.get("/profiles", (req, res) => {
  return res.status(200).json({
    data: {
      name: "john",
      age: 20,
    },
  });
});

app.post("/posts", async (req, res) => {
  try {
    const { title, image, category_id, description, content, status_id } =
      req.body;

    if (
      !title ||
      !image ||
      !description ||
      !content ||
      !category_id ||
      !status_id
    ) {
      return res.status(400).json({
        message:
          "Server could not create post because there are missing data from client",
      });
    }
    await connectionPool.query(
      "INSERT INTO posts (title, image, category_id, description, content, status_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, image, category_id, description, content, status_id],
    );

    return res.status(201).json({ message: "Created post successfully" });
  } catch (error) {
    console.error("Error inserting post:", error);
    return res.status(500).json({
      message: "Server could not create post because database connection",
    });
  }
});

// app.get("/posts", async (req, res) => {
//   try {
//     const results = await connectionPool.query("SELECT * FROM posts");
//     return res.status(200).json({ data: results.rows });
//   } catch (error) {
//     console.error("Error fetching posts:", error);
//     return res.status(500).json({
//       message: "Server could not fetch posts because database connection",
//     });
//   }
// });

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
