import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import pool from "./core/db";

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected at:", result.rows[0].now);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

start();
