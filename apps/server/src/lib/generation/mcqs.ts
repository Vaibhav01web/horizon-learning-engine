import { mcqGenSchema, type ParseResult } from "@zpl/shared-types";
import { z } from "zod";
import { generateStructured } from "../claude";

type McqGen = z.infer<typeof mcqGenSchema>;

export async function generateMcqs(
  material: string,
  parsed: ParseResult,
): Promise<McqGen["questions"]> {
  const { questions } = await generateStructured({
    schema: mcqGenSchema,
    material,
    maxTokens: 16000,
    instruction: [
      "Write multiple-choice questions on the study material.",
      "",
      `Cover these topics: ${parsed.topics.map((t) => t.topic).join(", ")}.`,
      "Produce 12-20 questions spread across the topics.",
      "",
      "options: exactly 4. The three distractors must be plausible to someone who half-learned",
      "the material — common misconceptions, adjacent facts, off-by-one values. Never filler",
      "like 'None of the above' or an obviously silly option.",
      "correct_index: the 0-based index of the correct option. Vary it across questions.",
      "explanation: why the correct answer is right AND why the tempting distractor is wrong.",
      "This is shown the moment the student answers, so it must teach, not just confirm.",
      "topic: must exactly match one of the topics listed above.",
    ].join("\n"),
  });

  // A wrong correct_index would silently mark every student answer incorrect.
  return questions.filter(
    (question) => question.correct_index >= 0 && question.correct_index < question.options.length,
  );
}
