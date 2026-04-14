import { getMenuItems } from "../menu/menu.service";

type ExtractedFilters = {
  city?: string;
  veg?: boolean;
  maxPrice?: number;
  minProtein?: number;
};

/**
 * Veg / Non-veg detection
 */
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

/**
 * City detection with normalization
 */
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

/**
 * Price extraction
 */
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

/**
 * Protein extraction
 */
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

function fakeEmbedding(text: string): number[] {
  const vector = new Array(10).fill(0);

  for (let i = 0; i < text.length; i++) {
    vector[i % 10] += text.charCodeAt(i);
  }

  return vector;
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

/**
 * Combine all filters
 */
export function extractFiltersFromText(input: string): ExtractedFilters {
  const filters: ExtractedFilters = {
    city: extractCity(input),
    veg: extractVegFilter(input),
    maxPrice: extractMaxPrice(input),
    minProtein: extractMinProtein(input),
  };

  // Optional: remove undefined fields
  return Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined)
  ) as ExtractedFilters;
}

/**
 * Main recommendation function
 */
export async function getRecommendationsFromText(input: string) {
  const filters = extractFiltersFromText(input);

  const items = await getMenuItems({
    ...filters,
    limit: 50,
    offset: 0,
  });

  // generate embedding for query
  const queryEmbedding = fakeEmbedding(input);

  const scored = items.map((item) => {
    const itemEmbedding = Array.isArray(item.embedding) ? item.embedding : [];

    const score = cosineSimilarity(queryEmbedding, itemEmbedding);

    return { ...item, score };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);

  return {
    filters,
    recommendations: ranked.slice(0, 10),
  };
}


