import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import connectionPool from "../utils/db.mjs";

// สร้าง Supabase client ด้วย URL และ ANON KEY จาก environment variables เพื่อเชื่อมต่อกับ Supabase Auth
// เราจะใช้ Supabase Auth สำหรับการจัดการผู้ใช้และการตรวจสอบสิทธิ์ ในขณะที่ข้อมูลผู้ใช้เพิ่มเติมจะถูกเก็บในฐานข้อมูล PostgreSQL ของเรา
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// สร้าง Express Router สำหรับจัดการเส้นทางที่เกี่ยวข้องกับการตรวจสอบสิทธิ์ (Authentication)
const authRouter = Router();

// Route สำหรับการลงทะเบียนผู้ใช้ (Register)
// ในขั้นตอนการลงทะเบียน เราจะตรวจสอบว่าชื่อผู้ใช้ที่ผู้ใช้เลือกนั้นซ้ำกับผู้ใช้อื่นหรือไม่ หากไม่ซ้ำ เราจะสร้างบัญชีผู้ใช้ใน Supabase Auth
// และเพิ่มข้อมูลผู้ใช้ในตาราง users ของฐานข้อมูล PostgreSQL
authRouter.post("/register", async (req, res) => {
  // ดึงข้อมูลที่ user ส่งมาจาก request body ซึ่งประกอบด้วย email, password, username และ name
  const { email, password, username, name } = req.body;
  try {
    const usernameCheckQuery = `
      SELECT * FROM users
      WHERE username = $1
    `;
    const usernameCheckValues = [username];
    // เก็บผลลัพธ์การตรวจสอบชื่อผู้ใช้ในตัวแปร existingUser ซึ่งเป็น array ของแถวที่ตรงกับเงื่อนไข(Object Destructuring with Rename)
    const { rows: existingUser } = await connectionPool.query(
      usernameCheckQuery,
      usernameCheckValues,
    );
    // หาก existingUser มีความยาวมากกว่า 0 แสดงว่ามีผู้ใช้ที่มีชื่อผู้ใช้นี้อยู่แล้ว เราจะส่ง response กลับไปยัง client ว่าชื่อผู้ใช้นี้ถูกใช้แล้ว
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "This username is already taken" });
    }

    // หากชื่อผู้ใช้ไม่ซ้ำ เราจะสร้างบัญชีผู้ใช้ใน Supabase Auth ด้วย email และ password ที่ผู้ใช้ส่งมา
    // หากการสร้างบัญชีผู้ใช้ใน Supabase Auth สำเร็จ เราจะได้รับข้อมูลผู้ใช้ใหม่ในตัวแปร data และหากมีข้อผิดพลาดจะถูกเก็บในตัวแปร supabaseError
    const { data, error: supabaseError } = await supabase.auth.signUp({
      email,
      password,
    });

    // หากมีข้อผิดพลาดในการสร้างบัญชีผู้ใช้ใน Supabase Auth เราจะตรวจสอบว่าเป็นข้อผิดพลาดที่เกิดจากการที่มีผู้ใช้ที่มี email นี้อยู่แล้วหรือไม่ และส่ง response กลับไปยัง client ตามกรณี
    if (supabaseError) {
      // ตรวจสอบว่า error code เป็น "user_already_exists" หรือไม่ ซึ่งหมายความว่ามีผู้ใช้ที่มี email นี้อยู่แล้วในระบบ
      if (supabaseError.code === "user_already_exists") {
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
      }
      return res
        .status(400)
        .json({ error: "Failed to create user. Please try again." });
    }

    // หากการสร้างบัญชีผู้ใช้ใน Supabase Auth สำเร็จ เราจะได้รับข้อมูลผู้ใช้ใหม่ในตัวแปร data ซึ่งประกอบด้วยข้อมูลต่าง ๆ ของผู้ใช้ รวมถึง id ของผู้ใช้ที่ถูกสร้างขึ้น
    const supabaseUserId = data.user.id;

    // หลังจากที่เราสร้างบัญชีผู้ใช้ใน Supabase Auth สำเร็จ เราจะเพิ่มข้อมูลผู้ใช้ในตาราง users ของฐานข้อมูล PostgreSQL
    // โดยใช้ id ที่ได้จาก Supabase Auth เป็น primary key และเก็บข้อมูลเพิ่มเติมเช่น username, name และ role
    const query = `
      INSERT INTO users (id, username, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    // เราจะใช้ parameterized query เพื่อป้องกัน SQL injection โดยการใช้ $1, $2, $3, $4 เป็นตัวแทนของค่าที่จะถูกแทรกเข้าไปใน
    // query และเก็บค่าที่จะถูกแทรกไว้ใน array values
    const values = [supabaseUserId, username, name, "user"];

    // เราจะใช้ connectionPool.query เพื่อรัน query ที่เราเตรียมไว้ โดยส่ง query และ values เข้าไปเป็นพารามิเตอร์
    // และเก็บผลลัพธ์ที่ได้จากการรัน query ในตัวแปร rows ซึ่งจะเป็น array ของแถวที่ถูกแทรกเข้าไปในตาราง users
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
    console.log("DB rows[0]:", rows[0]);
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
