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

app.get("/", async (req, res) => {
  try {
    const categoryParam = req.query.category;
    const keywordParam = req.query.keyword;
    const pageParam = parseInt(req.query.page) || 1;
    const PAGE_SIZE = 5;
    const offset = (pageParam - 1) * PAGE_SIZE;
    let query = "SELECT * FROM posts";
    let values = [];

    // ถ้า category หรือ keyword เป็นสตริงว่าง ให้กำหนดเป็น null แทน
    if (typeof categoryParam !== "string" || categoryParam.trim() === "") {
      categoryParam = null;
    }
    // ถ้า category หรือ keyword เป็นสตริงว่าง ให้กำหนดเป็น null แทน
    if (typeof keywordParam !== "string" || keywordParam.trim() === "") {
      keywordParam = null;
    }

    if (categoryParam && keywordParam) {
      query += " WHERE category ILIKE $1 AND keyword ILIKE $2 LIMIT $3 OFFSET $4";
      values = [`%${categoryParam}%`, `%${keywordParam}%`, PAGE_SIZE, offset];
    } else if (categoryParam) {
      query += " WHERE category ILIKE $1 LIMIT $2 OFFSET $3";
      values = [`%${categoryParam}%`, PAGE_SIZE, offset];
    } else if (keywordParam) {
      query += " WHERE keyword ILIKE $1 LIMIT $2 OFFSET $3";
      values = [`%${keywordParam}%`, PAGE_SIZE, offset];
    } else {
      query += " LIMIT $1 OFFSET $2";
      values = [PAGE_SIZE, offset];
    }
    const result = await connectionPool.query(query, values);
    return res.status(200).json({ data: result.rows });
  } catch (error) {
    console.error("Error fetching posts with filters:", error);
    return res.status(500).json({
      message: "Server could not retrieve posts due to a database error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
