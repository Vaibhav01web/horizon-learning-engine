import type { IngestRequest } from "@zpl/shared-types";
import { extractDocx } from "./docx";
import { extractImage } from "./image";
import { extractPdf } from "./pdf";
import { extractYoutube, UnsupportedVideoError } from "./youtube";
import { looksEmpty, normalizeText } from "./normalize";

export { UnsupportedVideoError };

export interface ExtractionResult {
  text: string;
  externalUrl?: string;
}

/**
 * Turns any supported input into normalized text. This is the single place
 * where input type branches; everything downstream sees plain text only.
 */
export async function extract(request: IngestRequest): Promise<ExtractionResult> {
  switch (request.kind) {
    case "text": {
      const text = normalizeText(request.text ?? "");
      if (looksEmpty(text, 120)) {
        throw new Error("Paste at least a paragraph or two of study material.");
      }
      return { text };
    }

    case "youtube": {
      const { text, videoId } = await extractYoutube(request.url!);
      return { text, externalUrl: `https://www.youtube.com/watch?v=${videoId}` };
    }

    case "pdf":
      return { text: await extractPdf(decode(request.fileBase64!)) };

    case "docx":
      return { text: await extractDocx(decode(request.fileBase64!)) };

    case "image":
      return {
        text: await extractImage(decode(request.fileBase64!), request.mimeType ?? "image/png"),
      };
  }
}

function decode(base64: string): Buffer {
  // Browsers may send a full data: URL; accept either form.
  const payload = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  return Buffer.from(payload, "base64");
}

export { normalizeText };
