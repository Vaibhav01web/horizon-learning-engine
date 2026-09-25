import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ isSsrBuild }) => ({
  // GitHub Pages serves a project site from /<repo>/, so assets and the router
  // need that prefix. Unset locally, which keeps dev and Vercel at "/".
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // React Flow and Supabase are only needed on a couple of routes, so
        // keep them out of the entry chunk. An SSR build externalises these,
        // which manual chunking cannot express.
        manualChunks: isSsrBuild
          ? undefined
          : {
              react: ["react", "react-dom", "react-router-dom"],
              flow: ["@xyflow/react", "dagre"],
              supabase: ["@supabase/supabase-js"],
            },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
