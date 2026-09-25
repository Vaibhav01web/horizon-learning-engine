import { extractText, getDocumentProxy } from "unpdf";
import { generateText } from "../claude";
import { looksEmpty, normalizeText } from "./normalize";

/**
 * Text-layer extraction first. Scanned PDFs have no text layer, so those fall
 * back to Claude Vision reading the document directly — no page rasterisation
 * step is needed because the Messages API accepts PDFs as document blocks.
 */
export async function extractPdf(buffer: Buffer): Promise<string> {
  const bytes = new Uint8Array(buffer);

  let extracted = "";
  try {
    const document = await getDocumentProxy(bytes);
    const result = await extractText(document, { mergePages: true });
    extracted = normalizeText(Array.isArray(result.text) ? result.text.join("\n\n") : result.text);
  } catch (error) {
    console.warn("[ingest:pdf] text layer unreadable, falling back to vision", error);
  }

  if (!looksEmpty(extracted)) return extracted;

  return normalizeText(await transcribeWithVision(buffer));
}

async function transcribeWithVision(buffer: Buffer): Promise<string> {
  const text = await generateText({
    system:
      "You transcribe scanned study documents. Output only the document's content as clean text — no commentary, no summary.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          { type: "text", text: VISION_INSTRUCTION },
        ],
      },
    ],
    maxTokens: 16000,
  });

  if (looksEmpty(text)) {
    throw new Error("This PDF appears to contain no readable text or images.");
  }
  return text;
}

export const VISION_INSTRUCTION = [
  "Transcribe everything in this document, preserving reading order:",
  "- all body text and headings",
  "- diagram and figure labels",
  "- tables, as pipe-separated rows",
  "- formulas, written out linearly (e.g. E = mc^2)",
  "- marginal notes and annotations",
  "Keep the original wording. Separate sections with a blank line.",
].join("\n");
