/**
 * Tiny migration runner.
 *
 * - Reads every .sql file in /migrations in lexical order
 * - Tracks which ones have already run in a `_migrations` table
 * - Runs each unapplied file inside a transaction
 *
 * Usage:  npm run db:migrate
 */

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import pool from "../src/core/db";

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    "SELECT filename FROM _migrations"
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigration(filename: string) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(fullPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO _migrations (filename) VALUES ($1)",
      [filename]
    );
    await client.query("COMMIT");
    console.log(`  ✓ ${filename}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  ✗ ${filename} failed:`, err);
    throw err;
  } finally {
    client.release();
  }
}

async function migrate() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  console.log(`Running ${pending.length} migration(s):`);
  for (const file of pending) {
    await runMigration(file);
  }
  console.log("Done.");
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
