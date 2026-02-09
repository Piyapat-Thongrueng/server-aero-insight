// **Repository Pattern** เป็นรูปแบบการออกแบบซอฟต์แวร์ที่ช่วยแยกตรรกะการเข้าถึงข้อมูลออกจากตรรกะทางธุรกิจของแอปพลิเคชัน
// โดยทำหน้าที่เป็นตัวกลางระหว่างชั้นโดเมนของแอปพลิเคชันและแหล่งข้อมูล (เช่น ฐานข้อมูล) ซึ่งช่วยให้การจัดการข้อมูลมีความยืดหยุ่นและง่ายต่อการบำรุงรักษามากขึ้น
// รับผิดชอบเฉพาะการติดต่อกับฐานข้อมูลที่เกี่ยวข้องกับโพสต์เท่านั้น ไม่ควรมีตรรกะทางธุรกิจใด ๆ ที่นี่
// ฟังก์ชันใน Repository Pattern นี้ควรเป็นเพียงการดำเนินการ CRUD กับตารางโพสต์เท่านั้น เช่น SQL คำสั่งสำหรับสร้าง อ่าน อัปเดต และลบโพสต์ join กับตารางที่เกี่ยวข้อง เช่น ผู้ใช้ และ หมวดหมู่

import connectionPool from "../utils/db.mjs";

const PostRepository = {
  findAllPosts: async (filters) => {
    // ***วิธีการเขียน Query แบบนี้เรียกว่า Dynamic Query ซึ่งช่วยให้เราสามารถปรับแต่งเงื่อนไขการค้นหาได้ตามที่ผู้ใช้ระบุเข้ามา***
    let { category, keyword, limit, offset } = filters;

    // Phase 1: Initialize Base Queries
    // Separation of Concerns: แยก count query กับ data query
    let countQuery = `
      SELECT COUNT(*) 
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    let countValues = [];

    let query = `
      SELECT 
        p.id,
        p.image,
        c.name as category,
        p.title,
        p.description,
        u.name as author,
        p.created_at,
        p.likes_count as likes,
        p.content
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    let values = [];

    // Phase 2: Pattern: Progressive Query Enhancement
    if (category && keyword) {
      // ใช้ Parameterized Query เพื่อป้องกัน SQL Injection
      const whereClause =
        " WHERE c.name ILIKE $1 AND (p.title ILIKE $2 OR p.content ILIKE $2)";
      countQuery += whereClause;
      countValues = [`%${category}%`, `%${keyword}%`];

      query += whereClause + " ORDER BY p.created_at DESC LIMIT $3 OFFSET $4";
      values = [`%${category}%`, `%${keyword}%`, limit, offset];
    } else if (category) {
      const whereClause = " WHERE c.name ILIKE $1";
      countQuery += whereClause;
      countValues = [`%${category}%`];

      query += whereClause + " ORDER BY p.created_at DESC LIMIT $2 OFFSET $3";
      values = [`%${category}%`, limit, offset];
    } else if (keyword) {
      const whereClause = " WHERE p.title ILIKE $1 OR p.content ILIKE $1";
      countQuery += whereClause;
      countValues = [`%${keyword}%`];

      query += whereClause + " ORDER BY p.created_at DESC LIMIT $2 OFFSET $3";
      values = [`%${keyword}%`, limit, offset];
    } else {
      query += " ORDER BY p.created_at DESC LIMIT $1 OFFSET $2";
      values = [limit, offset];
    }
    // Execute queries
    const countResult = await connectionPool.query(countQuery, countValues);
    const postsResult = await connectionPool.query(query, values);

    const totalPosts = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPosts / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return {
      totalPosts,
      totalPages,
      currentPage,
      limit,
      rows: postsResult.rows,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
    };
  },
  createPost: async (postData) => {
    return await connectionPool.query(
      "INSERT INTO posts (title, image, category_id, description, content, status_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        postData.title,
        postData.image,
        postData.category_id,
        postData.description,
        postData.content,
        postData.status_id,
      ],
    );
  },
  findPostById: async (postId) => {
    const query = `
      SELECT 
        p.id,
        p.image,
        c.name as category,
        p.title,
        p.description,
        u.name as author,
        p.created_at,
        p.likes_count as likes,
        p.content,
        p.status_id,
        p.updated_at
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;

    const result = await connectionPool.query(query, [postId]);
    return result.rows[0] || null; // ✅ Return null ถ้าไม่เจอ
  },
  updatePost: async (postId, postData) => {
    return await connectionPool.query(
      "UPDATE posts SET title = $1, image = $2, category_id = $3, description = $4, content = $5, status_id = $6 WHERE id = $7",
      [
        postData.title,
        postData.image,
        postData.category_id,
        postData.description,
        postData.content,
        postData.status_id,
        postId,
      ],
    );
  },
  deletePost: async (postId) => {
    return await connectionPool.query("DELETE FROM posts WHERE id = $1", [
      postId,
    ]);
  },
};

export default PostRepository;
