-- Adds an embedding column to menu_items so chat/recommend can do
-- semantic similarity scoring.
--
-- We store the embedding as JSONB for now. JSONB is fine for small
-- datasets where we load everything into memory and score in JS.
--
-- When the dataset grows we'll swap this to the pgvector "vector" type
-- and replace the JS cosine loop with a SQL `ORDER BY embedding <=> $1`
-- query for proper indexed similarity search.

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Helpful indexes for the menu filter API and the chat recommend pipeline.
-- These don't help similarity search (JSONB can't be indexed for cosine),
-- but they speed up the WHERE clauses that narrow the candidate set first.

CREATE INDEX IF NOT EXISTS idx_menu_items_veg ON menu_items(veg);
CREATE INDEX IF NOT EXISTS idx_menu_items_price ON menu_items(price);
CREATE INDEX IF NOT EXISTS idx_menu_items_protein ON menu_items(protein);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(LOWER(city));
