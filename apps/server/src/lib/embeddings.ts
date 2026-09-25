import { env } from "./env";

export const EMBEDDING_DIMENSIONS = 1024;

/**
 * Embeddings come from Voyage AI (Anthropic's recommended embedding partner);
 * Claude itself has no embeddings endpoint.
 *
 * When no key is configured the pipeline stores blocks without vectors and the
 * doubt chatbot falls back to keyword retrieval, so the app still works.
 */
export function embeddingsEnabled(): boolean {
  return Boolean(env.voyageApiKey);
}

export async function embed(
  texts: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  const apiKey = env.voyageApiKey;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not configured");
  if (texts.length === 0) return [];

  const vectors: number[][] = [];
  // Voyage caps a single request at 128 inputs.
  for (let i = 0; i < texts.length; i += 128) {
    const batch = texts.slice(i, i + 128);
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-3.5-lite",
        input: batch,
        input_type: inputType,
        output_dimension: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage embeddings failed (${response.status}): ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      data: { index: number; embedding: number[] }[];
    };
    const ordered = [...payload.data].sort((a, b) => a.index - b.index);
    vectors.push(...ordered.map((item) => item.embedding));
  }

  return vectors;
}

/** Splits normalized text into overlapping chunks on paragraph boundaries. */
export function chunkText(text: string, targetChars = 1200, overlapChars = 150): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 <= targetChars) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = current.slice(-overlapChars);
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    } else {
      // A single oversized paragraph — hard-split it.
      for (let i = 0; i < paragraph.length; i += targetChars) {
        chunks.push(paragraph.slice(i, i + targetChars));
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((chunk) => chunk.length > 40);
}
