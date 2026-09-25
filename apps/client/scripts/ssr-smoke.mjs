/**
 * Renders every route server-side to catch import cycles, bad hooks, and
 * crashes on first paint. No browser needed, so it runs anywhere CI does.
 *
 *   npm run smoke -w @zpl/client
 */
import { render } from "../dist-ssr/ssr-check.js";

const routes = [
  "/",
  "/community",
  "/chat?pack_id=11111111-1111-1111-1111-111111111111",
  "/study/11111111-1111-1111-1111-111111111111",
  "/battle/ABC123",
  "/processing/11111111-1111-1111-1111-111111111111",
];

let failed = 0;
for (const route of routes) {
  try {
    const html = render(route);
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 70);
    console.log(`✓ ${route.padEnd(50)} ${text}`);
  } catch (error) {
    failed += 1;
    console.log(`✗ ${route.padEnd(50)} ${error.message}`);
  }
}
process.exit(failed);
