import dotenv from "dotenv";
dotenv.config();

console.log("ENV CHECK:", {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

});

import app from "./app";
import pool from "./core/db";

const PORT = 4000;

async function start() {
  console.log("START FUNCTION EXECUTING");

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected at:", result.rows[0].now);

    app.listen(PORT, () => {
      console.log("SERVER RELOADED");
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

start();
