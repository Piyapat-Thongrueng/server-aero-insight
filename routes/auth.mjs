import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import connectionPool from "../utils/db.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);
const authRouter = Router();

// Route สำหรับการลงทะเบียนผู้ใช้ (Register)
authRouter.post("/register", async (req, res) => {
  const { email, password, username, name } = req.body;
  try {
    const usernameCheckQuery = `
      SELECT * FROM users
      WHERE username = $1
    `;
    // เช็คว่าชื่อผู้ใช้ซ้ำหรือไม่
    const usernameCheckValues = [username];
    // เก็บผลลัพธ์การตรวจสอบชื่อผู้ใช้ในตัวแปร existingUser ซึ่งเป็น array ของแถวที่ตรงกับเงื่อนไข(Object Destructuring with Rename
    const { rows: existingUser } = await connectionPool.query(
      usernameCheckQuery,
      usernameCheckValues,
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "This username is already taken" });
    }

    // สร้างผู้ใช้ใน Supabase Auth
    const { data, error: supabaseError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (supabaseError) {
      if (supabaseError.code === "user_already_exists") {
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
      }
      return res
        .status(400)
        .json({ error: "Failed to create user. Please try again." });
    }

    // เพิ่มข้อมูลผู้ใช้ในตาราง users ของฐานข้อมูล PostgreSQL ซึ่งจะแยกส่วนจาก Supabase Auth เราจะไม่เก็บemail และรหัสผ่านที่นี่
    const supabaseUserId = data.user.id;
    const query = `
      INSERT INTO users (id, username, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [supabaseUserId, username, name, "user"];

    const { rows } = await connectionPool.query(query, values);
    res.status(201).json({
      message: "User created successfully",
      user: rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred during registration" });
  }
});
// Route สำหรับการเข้าสู่ระบบ (Login)
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (
        error.code === "invalid_credentials" ||
        error.message.includes("Invalid login credentials")
      ) {
        return res.status(400).json({
          error: "Your password is incorrect or this email doesn't exist",
        });
      }
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({
      message: "Signed in successfully",
      access_token: data.session.access_token,
    });
  } catch (error) {
    return res.status(500).json({ error: "An error occurred during login" });
  }
});
// Route สำหรับดึงข้อมูลผู้ใช้ที่เข้าสู่ระบบแล้ว
authRouter.get("/get-user", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.status(401).json({ error: "Unauthorized or token expired" });
    }
    const supabaseUserId = data.user.id;
    const query = `
      SELECT * FROM users
      WHERE id = $1
    `;
    const values = [supabaseUserId];
    const { rows } = await connectionPool.query(query, values);
    res.status(200).json({
      id: data.user.id,
      email: data.user.email,
      username: rows[0].username,
      name: rows[0].name,
      role: rows[0].role,
      profilePic: rows[0].profile_pic,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
authRouter.put("/reset-password", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const { oldPassword, newPassword } = req.body;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }
  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }
  try {
    const { data: userData } = await supabase.auth.getUser(token);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: oldPassword,
    });
    if (loginError) {
      return res.status(400).json({ error: "Invalid old password" });
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
export default authRouter;
