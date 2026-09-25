/**
 * Central access to server-side configuration. Every secret is read here and
 * nowhere else, so nothing can leak into a response by accident.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceKey() {
    return required("SUPABASE_SERVICE_KEY");
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get voyageApiKey() {
    return optional("VOYAGE_API_KEY");
  },
  get tavilyApiKey() {
    return optional("TAVILY_API_KEY");
  },
  get serperApiKey() {
    return optional("SERPER_API_KEY");
  },
  get youtubeApiKey() {
    return optional("YOUTUBE_API_KEY");
  },
  get twilio() {
    const sid = optional("TWILIO_SID");
    const authToken = optional("TWILIO_AUTH_TOKEN");
    const from = optional("TWILIO_WHATSAPP_NUMBER");
    return sid && authToken && from ? { sid, authToken, from } : undefined;
  },
  get appUrl() {
    return process.env.PUBLIC_APP_URL ?? "http://localhost:5173";
  },
  get workerSecret() {
    return optional("WORKER_SECRET");
  },
  /** Hard ceiling on Claude spend per pack, enforced by the job runner. */
  get maxClaudeCallsPerPack() {
    return Number(process.env.MAX_CLAUDE_CALLS_PER_PACK ?? 12);
  },
} as const;

export const MODEL = "claude-opus-5";
