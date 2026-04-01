import { Router } from "express";
import connectionPool from "../utils/db.mjs";
import { supabase, supabaseAdmin } from "../utils/supabase.mjs";

// สร้าง Express Router สำหรับจัดการเส้นทางที่เกี่ยวข้องกับการตรวจสอบสิทธิ์ (Authentication)
const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password, username, name } = req.body;
  if (!email || !password || !username || !name) {
    return res
      .status(400)
      .json({ error: "Email, password, username, and name are required" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }
  let supabaseUserId;
  try {
    const usernameCheckQuery = `
      SELECT * FROM users
      WHERE username = $1
    `;
    const usernameCheckValues = [username];
    const { rows: existingUser } = await connectionPool.query(
      usernameCheckQuery,
      usernameCheckValues,
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "This username is already taken" });
    }

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

    supabaseUserId = data.user.id;

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
    if (error.code === "23505") {
      return res.status(400).json({ error: "This username is already taken" });
    }
    if (supabaseUserId) {
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
    }
    res.status(500).json({ error: "An error occurred during registration" });
  }
});
// Route สำหรับการเข้าสู่ระบบ (Login)
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
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
          error: "Your password is incorrect or this email does not exist",
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
// Route สำหรับการเข้าสู่ระบบเฉพาะแอดมิน (Admin Login)
// ต่างจาก /login ทั่วไปตรงที่จะตรวจสอบ role ใน DB ก่อนออก token
// หาก role ไม่ใช่ "admin" จะปฏิเสธทันที ป้องกันไม่ให้ user ทั่วไปได้ token ที่ใช้เข้า admin panel
authRouter.post("/login/admin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    // Step 1: ตรวจสอบ credentials กับ Supabase Auth ก่อน
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
          error: "Your password is incorrect or this email does not exist",
        });
      }
      return res.status(400).json({ error: error.message });
    }

    // Step 2: ตรวจสอบ role ใน DB ว่าเป็น admin จริงหรือไม่
    const { rows } = await connectionPool.query(
      "SELECT role FROM users WHERE id = $1",
      [data.user.id],
    );
    if (!rows.length || rows[0].role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    return res.status(200).json({
      message: "Admin signed in successfully",
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
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({
      id: data.user.id,
      email: data.user.email,
      username: rows[0].username,
      name: rows[0].name,
      role: rows[0].role,
      profile_pic: rows[0].profile_pic,
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
  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Both old and new passwords are required" });
  }
  try {
    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Unauthorized or token expired" });
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: oldPassword,
    });
    if (loginError) {
      return res.status(400).json({ error: "Invalid old password" });
    }
    // ใช้ Admin API แทน supabase.auth.updateUser() เพื่อป้องกัน Race Condition
    // supabase.auth.updateUser() อาศัย session ของ module-level client ที่ใช้ร่วมกันทุก request
    // ถ้ามีหลาย request พร้อมกัน session อาจถูก overwrite ทำให้อัปเดต password ผิด user ได้
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password: newPassword },
    );
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
export default authRouter;
