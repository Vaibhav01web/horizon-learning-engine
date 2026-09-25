import { parseResultSchema, type ParseResult } from "@zpl/shared-types";
import { generateStructured } from "../claude";

/**
 * The hierarchical parse. Everything else in the pipeline is derived from this
 * result, so it runs first and its output is stored as content blocks.
 */
export async function parseMaterial(material: string): Promise<ParseResult> {
  return generateStructured({
    schema: parseResultSchema,
    material,
    maxTokens: 16000,
    instruction: [
      "Read the study material and extract its learning structure.",
      "",
      "title: a specific title for this material, at most 8 words. Not 'Study Notes'.",
      "subject: the academic subject, e.g. 'Physics', 'Computer Science', 'History'.",
      "definitions: every term the material defines, with the definition in the material's own terms.",
      "formulas: every equation or formula, its linear expression, and what each symbol means.",
      "chronology: dated or ordered events, in order. Empty array if the material is not chronological.",
      "topics: the 4-10 main topics. For each, list its subtopics, rate importance, and write a",
      "2-4 sentence explanation a student could revise from.",
      "",
      "Extract only what the material actually contains. Return empty arrays for sections it lacks.",
    ].join("\n"),
  });
}
