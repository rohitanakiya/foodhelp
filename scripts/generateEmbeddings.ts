/**
 * Generate embeddings for menu items using whichever provider is
 * configured (local Transformers.js by default; OpenAI if
 * EMBEDDINGS_PROVIDER=openai).
 *
 * Reads menu_items where embedding IS NULL, batches them, and stores
 * the vector as JSONB. Re-running is safe — only items missing an
 * embedding are processed.
 *
 * Usage:  npm run embeddings:generate
 *
 * If you switch providers, null out the column first because vector
 * dimensions differ (local: 384, openai: 1536):
 *   UPDATE menu_items SET embedding = NULL;
 */

import dotenv from "dotenv";
dotenv.config();

import pool from "../src/core/db";
import { getEmbeddingsProvider } from "../src/core/embeddings";

const BATCH_SIZE = 16;

type MenuRow = {
  id: string;
  name: string;
  description: string | null;
};

function buildEmbeddingText(row: MenuRow): string {
  return [row.name, row.description ?? ""].filter(Boolean).join(". ");
}

async function generateEmbeddings() {
  const provider = getEmbeddingsProvider();
  console.log(`Using embeddings provider: ${provider.name} (dim=${provider.dimension})`);

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
      embeddings = await provider.embedMany(texts);
    } catch (err) {
      console.error(`Batch starting at ${i} failed:`, err);
      throw err;
    }

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

    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log("Done generating embeddings.");
}

generateEmbeddings()
  .catch((err) => {
    console.error("Embedding generation failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
