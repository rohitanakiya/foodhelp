import pool from "../src/core/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbeddings() {
  const res = await pool.query(`
    SELECT id, name, description
    FROM menu_items
    WHERE embedding IS NULL
  `);
  console.log("Rows to embed:", res.rows.length);



  for (const item of res.rows) {
    const text = `${item.name}. ${item.description}`;

function fakeEmbedding(text: string): number[] {
    const vector = new Array(10).fill(0);
      
    for (let i = 0; i < text.length; i++) {
          vector[i % 10] += text.charCodeAt(i);
        }
      
        return vector;
      }

    const embedding = fakeEmbedding(text);

    await pool.query(
      `UPDATE menu_items SET embedding = $1 WHERE id = $2`,
      [JSON.stringify(embedding), item.id]
    );

    console.log(`Embedded: ${item.name}`);
  }

  console.log("Done generating embeddings");
}

generateEmbeddings().catch(console.error);