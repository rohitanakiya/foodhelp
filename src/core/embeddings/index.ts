/**
 * Embeddings provider abstraction.
 *
 * Pick a provider via the EMBEDDINGS_PROVIDER env var:
 *
 *   local   (default) - Xenova/all-MiniLM-L6-v2, runs in-process, free,
 *                       384-dim, ~25MB model downloaded on first use.
 *                       Requires the optional @xenova/transformers
 *                       dependency to be installed. On hosts where that
 *                       package isn't available (e.g. memory-constrained
 *                       free tiers), the provider transparently falls
 *                       back to "no embedding" — chat.service then
 *                       returns filter-only ranking.
 *   openai            - OpenAI text-embedding-3-small, 1536-dim,
 *                       requires OPENAI_API_KEY and billing.
 *
 * IMPORTANT: All embeddings stored in the database must come from the
 * same provider — switching providers means re-running
 * `npm run embeddings:generate` after first nulling the column.
 */

export interface EmbeddingsProvider {
  readonly name: string;
  readonly dimension: number;
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}

// ---------- Local (Xenova / Transformers.js) ----------

class LocalEmbeddingsProvider implements EmbeddingsProvider {
  readonly name = "local:Xenova/all-MiniLM-L6-v2";
  readonly dimension = 384;

  // Cache the pipeline so the model is only loaded once per process.
  private pipelinePromise: Promise<any> | null = null;

  private async getPipeline(): Promise<any> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        // @xenova/transformers is ESM-only and an optional dependency.
        // If it's not installed (e.g. on Render free tier where the
        // onnxruntime binary is too big), this throw bubbles up and
        // the caller falls back to filter-only ranking.
        try {
          const transformers: any = await (Function(
            'return import("@xenova/transformers")'
          )() as Promise<any>);
          return transformers.pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2"
          );
        } catch (err) {
          throw new Error(
            "@xenova/transformers is not installed in this environment. " +
              "Install it locally for full semantic search, or set " +
              "EMBEDDINGS_PROVIDER=openai. Original error: " +
              (err as Error).message
          );
        }
      })();
    }
    return this.pipelinePromise;
  }

  async embed(text: string): Promise<number[]> {
    const [vec] = await this.embedMany([text]);
    return vec;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const extractor = await this.getPipeline();
    const result = await extractor(texts, {
      pooling: "mean",
      normalize: true,
    });
    const flat = Array.from(result.data as Float32Array);
    const dim = this.dimension;
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      out.push(flat.slice(i * dim, (i + 1) * dim));
    }
    return out;
  }
}

// ---------- OpenAI ----------

class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  readonly name = "openai:text-embedding-3-small";
  readonly dimension = 1536;

  private clientPromise: Promise<any> | null = null;

  private async getClient(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY is not set");
        }
        const { default: OpenAI } = await import("openai");
        return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      })();
    }
    return this.clientPromise;
  }

  async embed(text: string): Promise<number[]> {
    const [vec] = await this.embedMany([text]);
    return vec;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const client = await this.getClient();
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map((d: { embedding: number[] }) => d.embedding);
  }
}

// ---------- Factory ----------

let cachedProvider: EmbeddingsProvider | null = null;

export function getEmbeddingsProvider(): EmbeddingsProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const choice = (process.env.EMBEDDINGS_PROVIDER ?? "local").toLowerCase();

  switch (choice) {
    case "openai":
      cachedProvider = new OpenAIEmbeddingsProvider();
      break;
    case "local":
    default:
      cachedProvider = new LocalEmbeddingsProvider();
      break;
  }
  return cachedProvider;
}
