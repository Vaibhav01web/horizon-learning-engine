import { memeGenSchema, type ParseResult } from "@zpl/shared-types";
import { z } from "zod";
import { generateStructured } from "../claude";

type MemeGen = z.infer<typeof memeGenSchema>;

/** Text slots each stored template exposes, in top-to-bottom order. */
export const TEMPLATE_SLOTS: Record<string, string[]> = {
  "distracted-boyfriend": ["what students chase", "the student", "what actually matters"],
  drake: ["the wrong approach", "the right approach"],
  "expanding-brain": ["naive view", "better view", "correct view", "expert view"],
  "two-buttons": ["tempting option", "correct option"],
  "change-my-mind": ["the claim"],
};

export async function generateMemes(
  material: string,
  parsed: ParseResult,
): Promise<MemeGen["memes"]> {
  const { memes } = await generateStructured({
    schema: memeGenSchema,
    material,
    maxTokens: 6000,
    instruction: [
      "Write educational memes about the study material. The joke must carry a real point",
      "from the material — a common mistake, a counterintuitive result, a distinction students miss.",
      "",
      `Topics available: ${parsed.topics.map((t) => t.topic).join(", ")}.`,
      "",
      "Produce 3-5 memes. For each, pick the template whose structure fits the idea, then write",
      "one caption per slot of that template, in order:",
      ...Object.entries(TEMPLATE_SLOTS).map(
        ([template, slots]) => `- ${template}: ${slots.length} captions (${slots.join(" / ")})`,
      ),
      "",
      "Captions are at most 60 characters. No hashtags, no emoji.",
    ].join("\n"),
  });

  // Drop anything whose caption count doesn't match its template's slots —
  // the compositor has nowhere to put extras.
  return memes.filter((meme) => meme.captions.length === TEMPLATE_SLOTS[meme.template]?.length);
}
