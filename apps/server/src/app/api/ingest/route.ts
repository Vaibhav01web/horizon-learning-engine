import { ingestRequestSchema } from "@zpl/shared-types";
import { HttpError, ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";
import { normalizeText } from "@/lib/ingest";
import { parseVideoId } from "@/lib/ingest/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 20 MB before base64 expansion. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = { pdf: "pdf", docx: "docx", image: "img" };

/**
 * Accepts any supported input, stores it, and queues the generation job.
 * Heavy work happens in the job runner so this returns immediately.
 */
export const POST = route(async (request) => {
  const body = await parseBody(request, ingestRequestSchema);
  const client = db();

  const pack = unwrap(
    await client
      .from("study_packs")
      .insert({ title: body.title ?? "Generating your study pack…", status: "processing" })
      .select("id")
      .single(),
  ) as { id: string };

  const source: Record<string, unknown> = { pack_id: pack.id, kind: body.kind };

  if (body.kind === "text") {
    const text = normalizeText(body.text!);
    source.raw_text = text;
    source.char_count = text.length;
  } else if (body.kind === "youtube") {
    // Reject a malformed link now rather than failing the job a minute later.
    const videoId = parseVideoId(body.url!);
    source.external_url = `https://www.youtube.com/watch?v=${videoId}`;
  } else {
    const buffer = decodeUpload(body.fileBase64!);
    const path = `${pack.id}/source.${EXTENSIONS[body.kind]}`;
    const upload = await client.storage
      .from("raw-uploads")
      .upload(path, buffer, { contentType: body.mimeType ?? "application/octet-stream", upsert: true });
    if (upload.error) throw new HttpError(`Upload failed: ${upload.error.message}`, 502);

    source.storage_path = path;
    source.file_name = body.fileName ?? null;
  }

  const stored = unwrap(await client.from("sources").insert(source).select("id").single()) as {
    id: string;
  };

  const job = unwrap(
    await client
      .from("jobs")
      .insert({
        pack_id: pack.id,
        type: "generate_suite",
        status: "pending",
        stage: "extracting",
        payload: { sourceId: stored.id },
      })
      .select("id")
      .single(),
  ) as { id: string };

  return ok({ packId: pack.id, jobId: job.id }, 202);
});

function decodeUpload(base64: string): Buffer {
  const payload = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const buffer = Buffer.from(payload, "base64");
  if (buffer.byteLength === 0) throw new HttpError("The uploaded file is empty", 422);
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new HttpError(
      `File is ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB — the limit is 20 MB`,
      413,
    );
  }
  return buffer;
}
