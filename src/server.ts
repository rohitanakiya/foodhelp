import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import pool from "./core/db";

const PORT = Number(process.env.PORT) || 4000;

// In gateway mode, the public surface is the rate-limiter at :8000.
// The food-backend should bind to localhost only so nothing on the
// network can bypass the gateway and hit it directly.
//
// Override with HOST env var if you need a different bind address
// (e.g. "0.0.0.0" in a container behind an internal network).
const HOST =
  process.env.HOST ??
  (process.env.GATEWAY_MODE === "true" ? "127.0.0.1" : "0.0.0.0");

async function start() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected at:", result.rows[0].now);

    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      if (process.env.GATEWAY_MODE === "true") {
        console.log(
          "Gateway mode ON — bound to localhost only. Public access via the gateway."
        );
      }
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

start();
