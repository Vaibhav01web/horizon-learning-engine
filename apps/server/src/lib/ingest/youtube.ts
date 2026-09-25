import { YoutubeTranscript } from "youtube-transcript";
import { normalizeText } from "./normalize";

export class UnsupportedVideoError extends Error {}

/** Accepts watch URLs, short links, embeds, and bare IDs. */
export function parseVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|live)\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  throw new UnsupportedVideoError("That does not look like a YouTube video URL.");
}

export async function extractYoutube(url: string): Promise<{ text: string; videoId: string }> {
  const videoId = parseVideoId(url);

  let segments: { text: string }[];
  try {
    segments = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (error) {
    // A missing transcript is a real, expected outcome — surface it plainly
    // instead of letting the job fail with a library-level message.
    throw new UnsupportedVideoError(
      "This video has no available transcript, so it cannot be turned into a study pack. Try a lecture with captions enabled.",
    );
  }

  if (!segments?.length) {
    throw new UnsupportedVideoError("This video has no available transcript.");
  }

  // Transcript segments are caption-sized; regroup them into paragraphs so the
  // downstream chunker has real boundaries to split on.
  const sentences = decodeEntities(segments.map((s) => s.text).join(" "));
  const paragraphs: string[] = [];
  let current = "";
  for (const sentence of sentences.split(/(?<=[.!?])\s+/)) {
    current = current ? `${current} ${sentence}` : sentence;
    if (current.length > 700) {
      paragraphs.push(current);
      current = "";
    }
  }
  if (current.trim()) paragraphs.push(current.trim());

  return { text: normalizeText(paragraphs.join("\n\n")), videoId };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}
