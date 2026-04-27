/**
 * Generate embeddings for menu items.
 *
 * Reads menu_items where embedding IS NULL, batches them through
 * OpenAI's text-embedding-3-small model, and stores the resulting
 * 1536-dim vector as JSONB in the embedding column.
 *
 * Re-running is safe: only items missing an embedding are processed.
 *
 * Usage:  npm run embeddings:generate
 */

import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import pool from "../src/core/db";

const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 50;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type MenuRow = {
  id: string;
  name: string;
  description: string | null;
};

function buildEmbeddingText(row: MenuRow): string {
  // Combine fields so the embedding captures both the dish name
  // and the descriptive text the menu uses.
  return [row.name, row.description ?? ""].filter(Boolean).join(". ");
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

async function generateEmbeddings() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in .env");
  }

  const result = await pool.query<MenuRow>(`
    SELECT id, name, description
    FROM menu_items
    WHERE embedding IS NULL
    ORDER BY created_at ASC
  `);

  const rows = result.rows;
  console.log(`Rows to embed: ${rows.length}`);

  if (rows.length === 0) {
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map(buildEmbeddingText);

    let embeddings: number[][];
    try {
      embeddings = await embedBatch(texts);
    } catch (err) {
      console.error(`Batch starting at ${i} failed:`, err);
      throw err;
    }

    // One transaction per batch.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let j = 0; j < batch.length; j++) {
        await client.query(
          `UPDATE menu_items SET embedding = $1::jsonb WHERE id = $2`,
          [JSON.stringify(embeddings[j]), batch[j].id]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    console.log(
      `  Embedded ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`
    );
  }

  console.log("Done generating embeddings.");
}

generateEmbeddings()
  .catch((err) => {
    console.error("Embedding generation failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
