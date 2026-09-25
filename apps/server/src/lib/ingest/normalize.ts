/**
 * Collapses the many shapes of extracted text into one predictable form:
 * normalized newlines, no soft hyphens, no runs of blank lines, no page furniture.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .filter((line, index, lines) => {
      const trimmed = line.trim();
      // Drop standalone page numbers left behind by PDF extraction.
      if (/^\d{1,4}$/.test(trimmed) && lines.length > 40) return false;
      if (index > 0 && trimmed === "" && lines[index - 1].trim() === "") return false;
      return true;
    })
    .join("\n")
    .trim();
}

/** Text short enough to be a failed extraction rather than a short document. */
export function looksEmpty(text: string, minChars = 200): boolean {
  return text.replace(/\s/g, "").length < minChars;
}
