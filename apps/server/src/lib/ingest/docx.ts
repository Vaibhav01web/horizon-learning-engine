import mammoth from "mammoth";
import { looksEmpty, normalizeText } from "./normalize";

export async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  const text = normalizeText(value);
  if (looksEmpty(text, 60)) {
    throw new Error("This DOCX file contains no extractable text.");
  }
  return text;
}
