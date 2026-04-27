import OpenAI from "openai";
import { getMenuItems } from "../menu/menu.service";

const EMBEDDING_MODEL = "text-embedding-3-small";

// Lazy-init the OpenAI client. We don't construct it at module load time
// so that the rest of the app (including tests) can run even if the
// OPENAI_API_KEY isn't configured.
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

type ExtractedFilters = {
  city?: string;
  veg?: boolean;
  maxPrice?: number;
  minProtein?: number;
};

// ---------- Filter extraction (rule-based NLP) ----------

function extractVegFilter(input: string): boolean | undefined {
  const text = input.toLowerCase();

  if (/\b(non[-\s]?veg|chicken|mutton|meat|fish|egg)\b/.test(text)) {
    return false;
  }

  if (/\b(veg|vegetarian|plant[-\s]?based)\b/.test(text)) {
    return true;
  }

  return undefined;
}

function extractCity(input: string): string | undefined {
  const text = input.toLowerCase();

  const cityMap: Record<string, string> = {
    bengaluru: "bangalore",
  };

  const knownCities = [
    "bangalore",
    "bengaluru",
    "mumbai",
    "delhi",
    "pune",
    "hyderabad",
    "chennai",
    "kolkata",
  ];

  for (const city of knownCities) {
    if (text.includes(city)) {
      return cityMap[city] ?? city;
    }
  }

  return undefined;
}

function extractMaxPrice(input: string): number | undefined {
  const text = input.toLowerCase();

  const contextualMatch = text.match(
    /\b(?:under|below|less than|max|maximum|up to|upto)\s*(?:rs\.?|inr|\$)?\s*(\d+(?:\.\d+)?)\b/
  );

  if (contextualMatch) {
    return Number(contextualMatch[1]);
  }

  const priceMatch = text.match(
    /\b(?:price|budget)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)\b/
  );

  if (priceMatch) {
    return Number(priceMatch[1]);
  }

  if (/\b(cheap|affordable|budget)\b/.test(text)) {
    return 300;
  }

  return undefined;
}

function extractMinProtein(input: string): number | undefined {
  const text = input.toLowerCase();

  const contextualMatch = text.match(
    /\b(?:at least|min|minimum|more than|above)\s*(\d+(?:\.\d+)?)\s*g?\s*protein\b/
  );

  if (contextualMatch) {
    return Number(contextualMatch[1]);
  }

  const genericMatch = text.match(
    /\b(\d+(?:\.\d+)?)\s*g?\s*protein\b/
  );

  if (genericMatch) {
    return Number(genericMatch[1]);
  }

  if (/\b(high protein|protein[-\s]?rich|rich in protein)\b/.test(text)) {
    return 20;
  }

  return undefined;
}

export function extractFiltersFromText(input: string): ExtractedFilters {
  const filters: ExtractedFilters = {
    city: extractCity(input),
    veg: extractVegFilter(input),
    maxPrice: extractMaxPrice(input),
    minProtein: extractMinProtein(input),
  };

  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined)
  ) as ExtractedFilters;
}

// ---------- Embedding helpers ----------

async function embedQuery(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * pg returns JSONB columns already parsed (number[]), but some driver
 * configurations or migrations could leave it as a string. Handle both.
 */
function coerceEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    return raw as number[];
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ---------- Hybrid scoring ----------

/**
 * Combines semantic similarity, protein density, and restaurant rating
 * into a single ranking score. Weights are tunable.
 *
 * - similarity: how well the dish description matches the user's intent
 * - protein:    normalised against an expected ceiling of 50g
 * - rating:     normalised against the 5-star scale
 */
function hybridScore(
  similarity: number,
  protein: number,
  rating: number | null
): number {
  const proteinScore = Math.min(protein / 50, 1);
  const ratingScore = rating === null ? 0.5 : rating / 5;

  return 0.7 * similarity + 0.2 * proteinScore + 0.1 * ratingScore;
}

// ---------- Main entry point ----------

export async function getRecommendationsFromText(input: string) {
  const filters = extractFiltersFromText(input);

  const items = await getMenuItems({
    ...filters,
    limit: 50,
    offset: 0,
  });

  // If no OpenAI key is configured, gracefully degrade: return
  // filter-matched items ranked by rating, no semantic scoring.
  if (!process.env.OPENAI_API_KEY) {
    return {
      filters,
      recommendations: items.slice(0, 10).map((item) => ({
        ...item,
        embedding: undefined,
        similarity: null,
        score: hybridScore(0, item.protein, item.rating),
      })),
      note:
        "Semantic ranking disabled - OPENAI_API_KEY is not configured. Results are filter-only.",
    };
  }

  const queryEmbedding = await embedQuery(input);

  const scored = items.map((item) => {
    const itemEmbedding = coerceEmbedding(item.embedding);

    const similarity = itemEmbedding
      ? cosineSimilarity(queryEmbedding, itemEmbedding)
      : 0;

    const score = hybridScore(similarity, item.protein, item.rating);

    return {
      ...item,
      embedding: undefined, // strip raw vector from API response
      similarity,
      score,
    };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);

  return {
    filters,
    recommendations: ranked.slice(0, 10),
  };
}
