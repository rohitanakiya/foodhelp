import pool from "../../db";

interface UserProfileRow {
  id: string;
  email: string;
  username: string | null;
}

export async function getProfileByUserId(userId: string) {
  const query = `
    SELECT id, email, username
    FROM users
    WHERE id = $1
  `;

  const result = await pool.query<UserProfileRow>(query, [userId]);

  return result.rows[0] ?? null;
}
