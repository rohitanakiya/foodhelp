import dotenv from "dotenv";
dotenv.config();

import { Pool, type PoolConfig } from "pg";

/**
 * Build a Pool config that works in two environments:
 *
 * 1. Local dev — individual DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
 *    vars from .env, no SSL.
 *
 * 2. Production (Render, Railway, Heroku, Supabase, Neon, Fly Postgres) —
 *    a single DATABASE_URL connection string with SSL required.
 *
 * If DATABASE_URL is set we prefer it; otherwise fall back to the
 * individual vars. SSL is enabled automatically for DATABASE_URL or
 * when PGSSL=true (override for testing).
 */

function buildPoolConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      // Render's Postgres uses a self-signed cert. rejectUnauthorized=false
      // is the standard config — we're verifying the connection over TLS,
      // just not the certificate chain.
      ssl:
        process.env.PGSSL === "false"
          ? false
          : { rejectUnauthorized: false },
    };
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.PGSSL === "true"
        ? { rejectUnauthorized: false }
        : false,
  };
}

const pool = new Pool(buildPoolConfig());

export default pool;
