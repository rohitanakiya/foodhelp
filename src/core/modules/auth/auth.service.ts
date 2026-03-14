import bcrypt from "bcrypt";
import pool from "../../db";

export async function createUser(email: string, password: string, username?: string) {
  const saltRounds = 10;

  const passwordHash = await bcrypt.hash(password, saltRounds);

  const query = `
    INSERT INTO users (email, username, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, username, created_at
  `;

  const values = [email, username ?? null, passwordHash];

  const result = await pool.query(query, values);

  return result.rows[0];
}