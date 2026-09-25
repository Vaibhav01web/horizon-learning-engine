import Anthropic from "@anthropic-ai/sdk";
import { toJsonSchema, validateOutput, type OutputSchema } from "@zpl/shared-types";
import { MODEL, env } from "./env";

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

const BASE_SYSTEM = [
  "You are the parsing and generation engine behind a zero-prompt study suite.",
  "A student uploads raw material once; you turn it into study assets without ever asking a follow-up question.",
  "Work only from the supplied material. Never invent facts, dates, formulas, or citations that are not supported by it.",
  "If the material is too thin to fill a field, return the closest honest answer rather than padding.",
  "Write for a student revising the night before an exam: concrete, specific, and free of filler.",
].join("\n");

/**
 * Wraps the pack's normalized text so it can be cached across every generator.
 *
 * Caching is a prefix match, so this block and BASE_SYSTEM must be byte-identical
 * on every call in a run — the per-generator instruction goes in the user turn,
 * after the breakpoint.
 */
function materialBlock(material: string): Anthropic.Beta.BetaTextBlockParam {
  return {
    type: "text",
    text: `<study_material>\n${material}\n</study_material>`,
    // One hour covers a full generation run plus later chat turns for the pack.
    cache_control: { type: "ephemeral", ttl: "1h" },
  };
}

/**
 * Structured outputs go through @zpl/shared-types rather than the SDK's
 * `betaZodOutputFormat` helper. That helper imports `zod` from inside the SDK,
 * which resolves to the SDK's bundled Zod v3 — and v3 has no `toJSONSchema`.
 * Converting in the package that defines the schemas also keeps schema and
 * converter on the same Zod instance.
 */
function jsonSchemaFormat(schema: OutputSchema<unknown>): Anthropic.Beta.BetaJSONOutputFormat {
  return { type: "json_schema", schema: toJsonSchema(schema) };
}

export interface StructuredOptions<T> {
  schema: OutputSchema<T>;
  /** The normalized source text. Identical across calls so the cache hits. */
  material: string;
  /** What to produce from that material. Varies per call. */
  instruction: string;
  maxTokens?: number;
}

/**
 * Runs one structured-output call against the cached study material.
 *
 * Every generator in the pipeline shares the same system prefix and material
 * block, so only the first call pays full input price.
 */
export async function generateStructured<T>({
  schema,
  material,
  instruction,
  maxTokens = 16000,
}: StructuredOptions<T>): Promise<T> {
  const response = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: "text", text: BASE_SYSTEM }, materialBlock(material)],
    messages: [{ role: "user", content: instruction }],
    output_format: jsonSchemaFormat(schema),
  });

  assertUsable(response.stop_reason);

  const json = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Claude returned malformed JSON for a structured output.");
  }

  const parsed = validateOutput(schema, raw);
  if (!parsed.success) {
    throw new Error(`Claude's output did not match the expected schema: ${parsed.error}`);
  }
  return parsed.data;
}

/** Plain text completion — used for vision extraction and the doubt chatbot. */
export async function generateText(params: {
  system: string | Anthropic.Beta.BetaTextBlockParam[];
  messages: Anthropic.Beta.BetaMessageParam[];
  maxTokens?: number;
}): Promise<string> {
  const response = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 16000,
    system: params.system,
    messages: params.messages,
  });

  assertUsable(response.stop_reason);

  return response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * A refusal and a truncation both arrive as HTTP 200, so the stop reason has to
 * be checked before the content is trusted.
 */
function assertUsable(stopReason: Anthropic.Beta.BetaStopReason | null): void {
  if (stopReason === "refusal") {
    throw new Error("Claude declined to process this material.");
  }
  if (stopReason === "max_tokens") {
    throw new Error("Generation hit the output limit before completing. Try a shorter source.");
  }
  if (stopReason === "model_context_window_exceeded") {
    throw new Error("This material is too long to process in one pass. Split it into smaller uploads.");
  }
}
