import { chatRequestSchema } from "@zpl/shared-types";
import { HttpError, ok, parseBody, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { generateText } from "@/lib/claude";
import { retrieve, toContext } from "@/lib/retrieval";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * The contextual Doubt-Buster chatbot. The PDF links here with a pack_id and
 * an optional section_id, which pins retrieval to that section.
 */
export const POST = route(async (request) => {
  const body = await parseBody(request, chatRequestSchema);

  const { data: pack } = await db()
    .from("study_packs")
    .select("id, title, subject")
    .eq("id", body.packId)
    .maybeSingle();
  if (!pack) throw new HttpError("Study pack not found", 404);

  const blocks = await retrieve(body.packId, body.question, body.sectionId, 8);
  if (blocks.length === 0) {
    return ok({
      answer:
        "I could not find anything about that in this study pack. Try rephrasing, or ask about a topic that appears in the material.",
      sources: [],
    });
  }

  const answer = await generateText({
    system: [
      {
        type: "text",
        text: [
          `You answer student doubts about the study pack "${pack.title}"${pack.subject ? ` (${pack.subject})` : ""}.`,
          "Answer only from the numbered context provided. If the context does not contain the answer, say so plainly and name what the pack does cover instead.",
          "Cite the context entries you used as [1], [2] and so on.",
          "Be direct: two to five sentences unless the student asks for a walkthrough.",
        ].join("\n"),
      },
      {
        type: "text",
        text: `<context>\n${toContext(blocks)}\n</context>`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      ...(body.history ?? []).map((turn) => ({ role: turn.role, content: turn.content }) as const),
      { role: "user" as const, content: body.question },
    ],
    maxTokens: 2000,
  });

  return ok({
    answer,
    sources: blocks.map((block, index) => ({
      index: index + 1,
      id: block.id,
      kind: block.kind,
      heading: block.heading,
    })),
  });
});
