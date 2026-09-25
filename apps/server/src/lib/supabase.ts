import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/**
 * Service-role client. It bypasses RLS, so it must never be constructed
 * anywhere that its key could reach the browser.
 */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Throws with Supabase's message instead of silently returning null rows. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Query returned no data");
  return result.data;
}

export async function uploadToBucket(
  bucket: "raw-uploads" | "generated-pdfs" | "memes",
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const storage = db().storage.from(bucket);
  const { error } = await storage.upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Upload to ${bucket} failed: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}
