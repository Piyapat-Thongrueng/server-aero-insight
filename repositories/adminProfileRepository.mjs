import connectionPool from "../utils/db.mjs";

const AdminProfileRepository = {
  findAdminProfileById: async (userId) => {
    const { rows } = await connectionPool.query(
      `SELECT id, username, name, role, profile_pic, bio
       FROM users
       WHERE id = $1 AND role = 'admin'`,
      [userId],
    );

    return rows[0] || null;
  },

  findUserByUsernameExceptId: async (username, userId) => {
    const { rows } = await connectionPool.query(
      "SELECT id FROM users WHERE username = $1 AND id != $2",
      [username, userId],
    );

    return rows[0] || null;
  },

  findProfilePicByUserId: async (userId) => {
    const { rows } = await connectionPool.query(
      "SELECT profile_pic FROM users WHERE id = $1",
      [userId],
    );

    return rows[0]?.profile_pic || null;
  },

  updateAdminProfileById: async (userId, updates) => {
    const ALLOWED_COLUMNS = new Set(["name", "username", "bio", "profile_pic"]);
    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_COLUMNS.has(key)) continue;
      fieldsToUpdate.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }

    values.push(userId);

    const query = `
      UPDATE users
      SET ${fieldsToUpdate.join(", ")}
      WHERE id = $${paramIndex} AND role = 'admin'
      RETURNING id, username, name, role, profile_pic, bio
    `;

    const { rows } = await connectionPool.query(query, values);
    return rows[0] || null;
  },
};

export default AdminProfileRepository;
