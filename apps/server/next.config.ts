import type { NextConfig } from "next";

const config: NextConfig = {
  // The shared package ships raw TypeScript, so Next must compile it.
  transpilePackages: ["@zpl/shared-types"],
  // Native / heavyweight modules must stay as real Node requires.
  serverExternalPackages: ["puppeteer", "sharp", "mammoth", "unpdf", "twilio"],
  // Uploads arrive as base64 JSON, ~1.37x the raw file size. Route handlers
  // impose no body limit of their own; /api/ingest enforces 20 MB itself, but
  // the hosting platform's own request cap still applies on top.
};

export default config;
