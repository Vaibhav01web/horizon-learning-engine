import { flashcardGenSchema, type ParseResult } from "@zpl/shared-types";
import { z } from "zod";
import { generateStructured } from "../claude";

type FlashcardGen = z.infer<typeof flashcardGenSchema>;

export async function generateFlashcards(
  material: string,
  parsed: ParseResult,
): Promise<FlashcardGen["cards"]> {
  const { cards } = await generateStructured({
    schema: flashcardGenSchema,
    material,
    maxTokens: 12000,
    instruction: [
      "Create flashcards covering the study material.",
      "",
      `Cover these topics: ${parsed.topics.map((t) => t.topic).join(", ")}.`,
      "Produce 15-25 cards, weighted toward the topics marked high importance.",
      "",
      "front: a question or cue. Never 'What is X?' for every card — vary between recall,",
      "application, comparison, and 'why' questions.",
      "back: the answer, plus the one sentence of context that makes it stick.",
      "difficulty: easy for recall, medium for understanding, hard for application or synthesis.",
      "topic: must exactly match one of the topics listed above.",
    ].join("\n"),
  });

  return cards;
}
