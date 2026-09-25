import { summarySchema, type Summary } from "@zpl/shared-types";
import { generateStructured } from "../claude";

export async function generateSummary(material: string): Promise<Summary> {
  return generateStructured({
    schema: summarySchema,
    material,
    maxTokens: 8000,
    instruction: [
      "Write a layered summary of the study material.",
      "",
      "executive_overview: 2-3 sentences covering what this material is about and why it matters.",
      "bullet_breakdown: 6-12 entries. Each has a `point` (one line, the claim or concept itself)",
      "and a `detail` (2-4 sentences expanding it, including any relevant formula or example).",
      "",
      "The overview is shown immediately; details expand on click. Write each layer to stand alone.",
    ].join("\n"),
  });
}
