import { generateText } from "../claude";
import { VISION_INSTRUCTION } from "./pdf";
import { looksEmpty, normalizeText } from "./normalize";

const SUPPORTED = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMedia = (typeof SUPPORTED)[number];

export async function extractImage(buffer: Buffer, mimeType: string): Promise<string> {
  const media = normalizeMime(mimeType);

  const text = await generateText({
    system:
      "You read photographed and scanned textbook pages. Output only the page's content as clean text — no commentary.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: media, data: buffer.toString("base64") },
          },
          { type: "text", text: VISION_INSTRUCTION },
        ],
      },
    ],
  });

  const normalized = normalizeText(text);
  if (looksEmpty(normalized, 40)) {
    throw new Error("No readable text was found in this image.");
  }
  return normalized;
}

function normalizeMime(mimeType: string): SupportedMedia {
  const lower = mimeType.toLowerCase();
  if (lower === "image/jpg") return "image/jpeg";
  if ((SUPPORTED as readonly string[]).includes(lower)) return lower as SupportedMedia;
  throw new Error(`Unsupported image type "${mimeType}". Use JPEG, PNG, GIF, or WebP.`);
}
